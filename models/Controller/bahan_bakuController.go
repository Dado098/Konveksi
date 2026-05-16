package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetBahan mengembalikan seluruh data bahan baku.
// Endpoint: GET /api/bahan
func GetBahan(c *gin.Context) {
	var bahan []models.BahanBaku
	config.DB.Find(&bahan)
	c.JSON(http.StatusOK, bahan)
}

// CreateBahan menambah data bahan baku baru.
// Validasi memastikan nama tidak kosong dan stok tidak negatif.
// Endpoint: POST /api/bahan
func CreateBahan(c *gin.Context) {
	var bahan models.BahanBaku

	if err := c.ShouldBindJSON(&bahan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	bahan.NamaBahan = strings.TrimSpace(bahan.NamaBahan)
	if bahan.NamaBahan == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan wajib diisi"})
		return
	}

	var existing models.BahanBaku
	if err := config.DB.Where("LOWER(nama_bahan) = ?", strings.ToLower(bahan.NamaBahan)).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan sudah terdaftar"})
		return
	}

	if bahan.StokAktual < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stok tidak boleh negatif"})
		return
	}

	config.DB.Create(&bahan)
	c.JSON(http.StatusOK, bahan)
}

// UpdateBahan memperbarui data bahan baku berdasarkan ID.
// Endpoint: PUT /api/bahan/:id
func UpdateBahan(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var bahan models.BahanBaku

	if err := config.DB.First(&bahan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bahan tidak ditemukan"})
		return
	}

	var input models.BahanBaku
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	input.NamaBahan = strings.TrimSpace(input.NamaBahan)
	if input.NamaBahan == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan wajib diisi"})
		return
	}

	var existing models.BahanBaku
	if err := config.DB.
		Where("LOWER(nama_bahan) = ? AND id_bahan <> ?", strings.ToLower(input.NamaBahan), bahan.IDBahan).
		First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan sudah terdaftar"})
		return
	}

	if input.StokAktual < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stok tidak boleh negatif"})
		return
	}

	// UPDATE SEMUA FIELD
	bahan.IDCabang = input.IDCabang
	bahan.IDSupplier = input.IDSupplier
	bahan.NamaBahan = input.NamaBahan
	bahan.StokAktual = input.StokAktual
	bahan.BatasMinimum = input.BatasMinimum

	config.DB.Save(&bahan)

	c.JSON(http.StatusOK, bahan)
}

// DeleteBahan menghapus data bahan baku.
// Endpoint: DELETE /api/bahan/:id
func DeleteBahan(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var bahan models.BahanBaku

	if err := config.DB.First(&bahan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bahan tidak ditemukan"})
		return
	}

	config.DB.Delete(&bahan)

	c.JSON(http.StatusOK, gin.H{"message": "Bahan berhasil dihapus"})
}
