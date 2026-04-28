package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetSupplier mengembalikan daftar supplier.
// Endpoint: GET /api/supplier
func GetSupplier(c *gin.Context) {
	var suppliers []models.Supplier

	// Ambil semua data supplier
	config.DB.Find(&suppliers)

	// Kirim response JSON
	c.JSON(http.StatusOK, suppliers)
}

// GetSupplierByID mengambil supplier berdasarkan ID.
// Endpoint: GET /api/supplier/:id
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

// CreateSupplier menambahkan supplier baru.
// Endpoint: POST /api/supplier
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

// UpdateSupplier memperbarui data supplier berdasarkan ID.
// Endpoint: PUT /api/supplier/:id
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

// DeleteSupplier menghapus supplier berdasarkan ID.
// Endpoint: DELETE /api/supplier/:id
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
