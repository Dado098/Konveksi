package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL BAHAN
func GetBahan(c *gin.Context) {
	var bahan []models.BahanBaku
	config.DB.Find(&bahan)
	c.JSON(http.StatusOK, bahan)
}

// CREATE BAHAN
func CreateBahan(c *gin.Context) {
	var bahan models.BahanBaku

	if err := c.ShouldBindJSON(&bahan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	if bahan.NamaBahan == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan wajib diisi"})
		return
	}

	if bahan.StokAktual < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stok tidak boleh negatif"})
		return
	}

	config.DB.Create(&bahan)
	c.JSON(http.StatusOK, bahan)
}

// UPDATE BAHAN
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
	if input.NamaBahan == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama bahan wajib diisi"})
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

// DELETE BAHAN
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
