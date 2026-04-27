package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL ALOKASI
func GetAlokasi(c *gin.Context) {
	var data []models.AlokasiProduksi
	config.DB.Find(&data)
	c.JSON(http.StatusOK, data)
}

// CREATE ALOKASI
func CreateAlokasi(c *gin.Context) {
	var input models.AlokasiProduksi

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Create(&input)
	c.JSON(http.StatusOK, input)
}

// UPDATE ALOKASI
func UpdateAlokasi(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.AlokasiProduksi

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alokasi tidak ditemukan"})
		return
	}

	var input models.AlokasiProduksi
	c.ShouldBindJSON(&input)

	config.DB.Model(&data).Updates(input)

	c.JSON(http.StatusOK, data)
}

// DELETE ALOKASI
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
