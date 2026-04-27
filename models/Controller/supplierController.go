package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GET ALL SUPPLIER
func GetSupplier(c *gin.Context) {
	var suppliers []models.Supplier

	// Ambil semua data supplier
	config.DB.Find(&suppliers)

	// Kirim response JSON
	c.JSON(http.StatusOK, suppliers)
}

// GET SUPPLIER BY ID
func GetSupplierByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	// Validasi ID
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var supplier models.Supplier

	// Cari data berdasarkan ID
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

// CREATE SUPPLIER
func CreateSupplier(c *gin.Context) {
	var input models.Supplier

	// Bind JSON request
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI SEDERHANA
	if input.NamaSupplier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama supplier wajib diisi"})
		return
	}

	// Simpan ke database
	config.DB.Create(&input)

	c.JSON(http.StatusOK, input)
}

// UPDATE SUPPLIER
func UpdateSupplier(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var supplier models.Supplier

	// Cek apakah data ada
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier tidak ditemukan"})
		return
	}

	var input models.Supplier

	// Ambil data baru
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update data
	config.DB.Model(&supplier).Updates(models.Supplier{
		NamaSupplier:   input.NamaSupplier,
		Alamat:         input.Alamat,
		NoHP:           input.NoHP,
		Email:          input.Email,
		NamaPerusahaan: input.NamaPerusahaan,
	})

	c.JSON(http.StatusOK, supplier)
}

// DELETE SUPPLIER
func DeleteSupplier(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var supplier models.Supplier

	// Cek data
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier tidak ditemukan"})
		return
	}

	// Hapus data
	config.DB.Delete(&supplier)

	c.JSON(http.StatusOK, gin.H{"message": "Supplier berhasil dihapus"})
}
