package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL CABANG
func GetCabang(c *gin.Context) {
	var cabang []models.Cabang
	config.DB.Find(&cabang)
	c.JSON(http.StatusOK, cabang)
}

// GET CABANG BY ID
func GetCabangByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var cabang models.Cabang
	if err := config.DB.First(&cabang, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cabang tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, cabang)
}

// CREATE CABANG
func CreateCabang(c *gin.Context) {
	var cabang models.Cabang

	if err := c.ShouldBindJSON(&cabang); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	if cabang.NamaCabang == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama cabang wajib diisi"})
		return
	}

	if cabang.Lokasi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lokasi wajib diisi"})
		return
	}

	config.DB.Create(&cabang)
	c.JSON(http.StatusOK, cabang)
}

// UPDATE CABANG
func UpdateCabang(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var cabang models.Cabang
	if err := config.DB.First(&cabang, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cabang tidak ditemukan"})
		return
	}

	var input models.Cabang
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	if input.NamaCabang == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama cabang wajib diisi"})
		return
	}

	if input.Lokasi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lokasi wajib diisi"})
		return
	}

	// UPDATE (lebih clean)
	config.DB.Model(&cabang).Updates(models.Cabang{
		NamaCabang: input.NamaCabang,
		Lokasi:     input.Lokasi,
	})

	c.JSON(http.StatusOK, cabang)
}

// DELETE CABANG
func DeleteCabang(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var cabang models.Cabang
	if err := config.DB.First(&cabang, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cabang tidak ditemukan"})
		return
	}

	config.DB.Delete(&cabang)

	c.JSON(http.StatusOK, gin.H{"message": "Cabang berhasil dihapus"})
}
