package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	statusProses = "proses"
)

var cancelStatuses = map[string]struct{}{
	"batal":      {},
	"cancel":     {},
	"dibatalkan": {},
}

func normalizeStatus(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isCancelStatus(value string) bool {
	_, ok := cancelStatuses[normalizeStatus(value)]
	return ok
}

func buildUsageByBahan(tx *gorm.DB, pesananID uint) (map[uint]float64, error) {
	var alokasi []models.AlokasiProduksi
	if err := tx.Where("id_pesanan = ?", pesananID).Find(&alokasi).Error; err != nil {
		return nil, err
	}
	if len(alokasi) == 0 {
		return map[uint]float64{}, nil
	}

	alokasiQty := make(map[uint]int)
	alokasiIDs := make([]uint, 0, len(alokasi))
	for _, row := range alokasi {
		alokasiQty[row.IDAlokasi] = row.QtyAlokasi
		alokasiIDs = append(alokasiIDs, row.IDAlokasi)
	}

	var detail []models.DetailKebutuhanBahan
	if err := tx.Where("id_alokasi IN ?", alokasiIDs).Find(&detail).Error; err != nil {
		return nil, err
	}

	usage := make(map[uint]float64)
	for _, row := range detail {
		qtyAlokasi := alokasiQty[row.IDAlokasi]
		usage[row.IDBahan] += float64(qtyAlokasi) * row.QtyBahanPerPcs
	}

	return usage, nil
}

func applyStockChange(tx *gorm.DB, pesananID uint, deduct bool) error {
	usageByBahan, err := buildUsageByBahan(tx, pesananID)
	if err != nil {
		return err
	}

	for bahanID, usage := range usageByBahan {
		if usage <= 0 {
			continue
		}

		var bahan models.BahanBaku
		if err := tx.First(&bahan, bahanID).Error; err != nil {
			return err
		}

		newStock := bahan.StokAktual
		if deduct {
			if newStock < usage {
				return errors.New("stok tidak mencukupi untuk pesanan")
			}
			newStock -= usage
		} else {
			newStock += usage
		}

		if err := tx.Model(&models.BahanBaku{}).Where("id_bahan = ?", bahanID).Update("stok_aktual", newStock).Error; err != nil {
			return err
		}
	}

	return nil
}

// GetPesanan mengembalikan seluruh data pesanan global.
// Endpoint: GET /api/pesanan
func GetPesanan(c *gin.Context) {
	var data []models.PesananGlobal

	// Ambil semua data pesanan dari database
	config.DB.Find(&data)

	// Kirim response JSON
	c.JSON(http.StatusOK, data)
}

// CreatePesanan menambahkan pesanan baru.
// Endpoint: POST /api/pesanan
func CreatePesanan(c *gin.Context) {
	var input models.PesananGlobal

	// Bind JSON dari request ke struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Simpan ke database
	input.TotalHarga = input.HargaFlat
	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if normalizeStatus(input.StatusGlobal) == statusProses {
		tx := config.DB.Begin()
		if err := applyStockChange(tx, input.IDPesanan, true); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, input)
}

// UpdatePesanan memperbarui pesanan berdasarkan ID.
// Endpoint: PUT /api/pesanan/:id
func UpdatePesanan(c *gin.Context) {
	// Ambil ID dari URL
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var data models.PesananGlobal

	// Cek apakah data ada
	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesanan tidak ditemukan"})
		return
	}
	previousStatus := normalizeStatus(data.StatusGlobal)

	var input models.PesananGlobal

	// Ambil data baru dari request
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newStatus := normalizeStatus(input.StatusGlobal)
	if newStatus == "" {
		newStatus = previousStatus
	}

	tx := config.DB.Begin()

	hargaFlatValue := input.HargaFlat
	if hargaFlatValue <= 0 {
		hargaFlatValue = data.HargaFlat
	}
	if hargaFlatValue <= 0 {
		hargaFlatValue = data.TotalHarga
	}

	totalQtyValue := input.TotalQty
	if totalQtyValue <= 0 {
		totalQtyValue = data.TotalQty
	}

	bayarValue := input.Bayar
	if isCancelStatus(newStatus) {
		// Saat batal, default bayar = 0 agar tidak dianggap lunas.
		// Jika client mengirim nilai bayar > 0, biarkan sebagai DP/parsial.
		if bayarValue == 0 {
			bayarValue = 0
		}
	} else if bayarValue == 0 {
		// Jika bukan batal dan client tidak mengirim bayar, pertahankan nilai lama.
		bayarValue = data.Bayar
	}

	updateData := map[string]interface{}{
		"nama_pesanan":  input.NamaPesanan,
		"total_qty":     totalQtyValue,
		"harga_flat":    hargaFlatValue,
		"total_harga":   hargaFlatValue,
		"bayar":         bayarValue,
		"tgl_deadline":  input.TglDeadline,
		"status_global": input.StatusGlobal,
	}

	if err := tx.Model(&data).Updates(updateData).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if previousStatus != statusProses && newStatus == statusProses {
		if err := applyStockChange(tx, data.IDPesanan, true); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if previousStatus == statusProses && isCancelStatus(newStatus) {
		if err := applyStockChange(tx, data.IDPesanan, false); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// DeletePesanan menghapus data pesanan berdasarkan ID.
// Endpoint: DELETE /api/pesanan/:id
func DeletePesanan(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var data models.PesananGlobal

	// Cek apakah data ada
	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesanan tidak ditemukan"})
		return
	}

	if normalizeStatus(data.StatusGlobal) == statusProses {
		tx := config.DB.Begin()
		if err := applyStockChange(tx, data.IDPesanan, false); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := tx.Delete(&data).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Pesanan berhasil dihapus"})
		return
	}

	// Hapus data
	config.DB.Delete(&data)

	c.JSON(http.StatusOK, gin.H{"message": "Pesanan berhasil dihapus"})
}
