package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET LOG
func GetLog(c *gin.Context) {
	var data []models.LogKerjaKaryawan
	config.DB.Find(&data)
	c.JSON(http.StatusOK, data)
}

// CREATE LOG
func CreateLog(c *gin.Context) {
	var input models.LogKerjaKaryawan

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Create(&input)
	c.JSON(http.StatusOK, input)
}

// DELETE LOG (opsional)
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
