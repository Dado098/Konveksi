package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetCabang mengembalikan daftar seluruh cabang.
// Endpoint: GET /api/cabang
func GetCabang(c *gin.Context) {
	var cabang []models.Cabang
	config.DB.Find(&cabang)
	c.JSON(http.StatusOK, cabang)
}

// GetCabangByID mengambil detail cabang berdasarkan ID.
// Endpoint: GET /api/cabang/:id
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

// CreateCabang menambah cabang baru dengan validasi nama dan lokasi.
// Endpoint: POST /api/cabang
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

// UpdateCabang memperbarui data cabang berdasarkan ID.
// Endpoint: PUT /api/cabang/:id
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

// DeleteCabang menghapus data cabang berdasarkan ID.
// Endpoint: DELETE /api/cabang/:id
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
