package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetAlokasi mengembalikan seluruh data alokasi produksi.
// Endpoint: GET /api/alokasi
func GetAlokasi(c *gin.Context) {
	var data []models.AlokasiProduksi
	config.DB.Find(&data)
	if len(data) == 0 {
		c.JSON(http.StatusOK, data)
		return
	}

	pesananIDs := make([]uint, 0, len(data))
	for _, row := range data {
		pesananIDs = append(pesananIDs, row.IDPesanan)
	}

	var pesanan []models.PesananGlobal
	config.DB.Where("id_pesanan IN ?", pesananIDs).Find(&pesanan)
	pesananSet := make(map[uint]struct{}, len(pesanan))
	for _, row := range pesanan {
		pesananSet[row.IDPesanan] = struct{}{}
	}

	filtered := make([]models.AlokasiProduksi, 0, len(data))
	orphanAlokasi := make([]uint, 0)
	for _, row := range data {
		if _, ok := pesananSet[row.IDPesanan]; ok {
			filtered = append(filtered, row)
		} else {
			orphanAlokasi = append(orphanAlokasi, row.IDAlokasi)
		}
	}

	if len(orphanAlokasi) > 0 {
		if err := config.DB.Where("id_alokasi IN ?", orphanAlokasi).Delete(&models.DetailKebutuhanBahan{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := config.DB.Where("id_alokasi IN ?", orphanAlokasi).Delete(&models.LogKerjaKaryawan{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := config.DB.Where("id_alokasi IN ?", orphanAlokasi).Delete(&models.AlokasiProduksi{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, filtered)
}

// CreateAlokasi menambah data alokasi produksi.
// Endpoint: POST /api/alokasi
func CreateAlokasi(c *gin.Context) {
	var input models.AlokasiProduksi

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IDPesanan == 0 || input.IDCabang == 0 || input.QtyAlokasi <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data alokasi tidak lengkap"})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

// UpdateAlokasi memperbarui data alokasi produksi berdasarkan ID.
// Endpoint: PUT /api/alokasi/:id
func UpdateAlokasi(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.AlokasiProduksi

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alokasi tidak ditemukan"})
		return
	}

	previousStatus := normalizeStatus(data.StatusLokal)

	var input models.AlokasiProduksi
	c.ShouldBindJSON(&input)

	nextStatus := normalizeStatus(input.StatusLokal)
	if nextStatus == "" {
		nextStatus = previousStatus
	}

	tx := config.DB.Begin()
	if err := tx.Model(&data).Updates(input).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if previousStatus != statusProses && nextStatus == statusProses {
		var pesanan models.PesananGlobal
		if err := tx.First(&pesanan, data.IDPesanan).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if normalizeStatus(pesanan.StatusGlobal) != statusProses {
			if err := tx.Model(&pesanan).Update("status_global", "Proses").Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			if err := applyStockChange(tx, data.IDPesanan, true); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// DeleteAlokasi menghapus data alokasi produksi.
// Endpoint: DELETE /api/alokasi/:id
func DeleteAlokasi(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.AlokasiProduksi

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alokasi tidak ditemukan"})
		return
	}

	config.DB.Delete(&data)

	c.JSON(http.StatusOK, gin.H{"message": "Alokasi dihapus"})
}
