package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL DETAIL
func GetDetailBahan(c *gin.Context) {
	var data []models.DetailKebutuhanBahan
	config.DB.Find(&data)
	c.JSON(http.StatusOK, data)
}

// CREATE DETAIL
func CreateDetailBahan(c *gin.Context) {
	var input models.DetailKebutuhanBahan

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Create(&input)
	c.JSON(http.StatusOK, input)
}

// UPDATE DETAIL
func UpdateDetailBahan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.DetailKebutuhanBahan

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan"})
		return
	}

	var input models.DetailKebutuhanBahan
	c.ShouldBindJSON(&input)

	config.DB.Model(&data).Updates(input)

	c.JSON(http.StatusOK, data)
}

// DELETE DETAIL
func DeleteDetailBahan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.DetailKebutuhanBahan

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan"})
		return
	}

	config.DB.Delete(&data)

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
