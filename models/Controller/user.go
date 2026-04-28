package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"

	"github.com/gin-gonic/gin"
)

// GetUser mengembalikan daftar user untuk kebutuhan autentikasi & manajemen.
// Endpoint: GET /api/user
func GetUser(c *gin.Context) {
	var users []models.User

	// Ambil semua data user
	config.DB.Find(&users)

	c.JSON(http.StatusOK, users)
}

// GetUserByID mengambil detail user berdasarkan ID.
// Endpoint: GET /api/user/:id
func GetUserByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	// Validasi ID
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var user models.User

	// Cari user berdasarkan ID
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// CreateUser menambahkan user baru dengan validasi nama dan role.
// Role valid: owner | admin | karyawan
// Endpoint: POST /api/user
func CreateUser(c *gin.Context) {
	var input models.User

	// Bind JSON request
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDASI
	if input.Nama == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama wajib diisi"})
		return
	}

	if input.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role wajib diisi"})
		return
	}

	// Optional: validasi role
	validRole := map[string]bool{
		"owner":    true,
		"admin":    true,
		"karyawan": true,
	}

	if !validRole[input.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role tidak valid"})
		return
	}

	// Simpan ke database
	config.DB.Create(&input)

	c.JSON(http.StatusOK, input)
}

// UpdateUser memperbarui data user berdasarkan ID.
// Endpoint: PUT /api/user/:id
func UpdateUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var user models.User

	// Cek apakah user ada
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	var input models.User

	// Bind data baru
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update data
	config.DB.Model(&user).Updates(models.User{
		IDCabang: input.IDCabang,
		Nama:     input.Nama,
		Role:     input.Role,
	})

	c.JSON(http.StatusOK, user)
}

// DeleteUser menghapus user berdasarkan ID.
// Endpoint: DELETE /api/user/:id
func DeleteUser(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var user models.User

	// Cek data
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	// Hapus
	config.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{"message": "User berhasil dihapus"})
}
