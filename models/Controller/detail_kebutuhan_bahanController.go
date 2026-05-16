package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetDetailBahan mengambil seluruh detail kebutuhan bahan.
// Endpoint: GET /api/detail_kebutuhan_bahan
func GetDetailBahan(c *gin.Context) {
	var data []models.DetailKebutuhanBahan
	config.DB.Find(&data)
	c.JSON(http.StatusOK, data)
}

// CreateDetailBahan menambah detail kebutuhan bahan.
// Endpoint: POST /api/detail_kebutuhan_bahan
func CreateDetailBahan(c *gin.Context) {
	var input models.DetailKebutuhanBahan

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.QtyBahanPerPcs <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Qty bahan per pcs harus lebih dari 0"})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

// UpdateDetailBahan memperbarui detail kebutuhan bahan berdasarkan ID.
// Endpoint: PUT /api/detail_kebutuhan_bahan/:id
func UpdateDetailBahan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var data models.DetailKebutuhanBahan

	if err := config.DB.First(&data, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan"})
		return
	}

	var input models.DetailKebutuhanBahan
	c.ShouldBindJSON(&input)

	if input.QtyBahanPerPcs <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Qty bahan per pcs harus lebih dari 0"})
		return
	}

	config.DB.Model(&data).Updates(input)

	c.JSON(http.StatusOK, data)
}

// DeleteDetailBahan menghapus detail kebutuhan bahan.
// Endpoint: DELETE /api/detail_kebutuhan_bahan/:id
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
