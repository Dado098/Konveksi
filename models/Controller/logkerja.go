package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetLog mengembalikan log kerja karyawan.
// Endpoint: GET /api/log
func GetLog(c *gin.Context) {
	var data []models.LogKerjaKaryawan
	config.DB.Find(&data)
	c.JSON(http.StatusOK, data)
}

// CreateLog menambahkan log aktivitas baru.
// Endpoint: POST /api/log
func CreateLog(c *gin.Context) {
	var input models.LogKerjaKaryawan

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Create(&input)
	c.JSON(http.StatusOK, input)
}

// DeleteLog menghapus log kerja berdasarkan ID.
// Endpoint: DELETE /api/log/:id
func DeleteLog(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.LogKerjaKaryawan

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log tidak ditemukan"})
		return
	}

	config.DB.Delete(&data)

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
