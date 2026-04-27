package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL PESANAN
func GetPesanan(c *gin.Context) {
	var data []models.PesananGlobal

	// Ambil semua data pesanan dari database
	config.DB.Find(&data)

	// Kirim response JSON
	c.JSON(http.StatusOK, data)
}

// CREATE PESANAN
func CreatePesanan(c *gin.Context) {
	var input models.PesananGlobal

	// Bind JSON dari request ke struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Simpan ke database
	config.DB.Create(&input)

	c.JSON(http.StatusOK, input)
}

// UPDATE PESANAN
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

	var input models.PesananGlobal

	// Ambil data baru dari request
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update data
	config.DB.Model(&data).Updates(input)

	c.JSON(http.StatusOK, data)
}

// DELETE PESANAN
func DeletePesanan(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var data models.PesananGlobal

	// Cek apakah data ada
	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesanan tidak ditemukan"})
		return
	}

	// Hapus data
	config.DB.Delete(&data)

	c.JSON(http.StatusOK, gin.H{"message": "Pesanan berhasil dihapus"})
}
