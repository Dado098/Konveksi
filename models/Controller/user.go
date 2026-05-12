package controllers

import (
	"net/http"
	"strconv"

	"jr-konveksi/config"
	"jr-konveksi/models"
	"jr-konveksi/utils"

	"github.com/gin-gonic/gin"
)

type userInput struct {
	IDCabang uint   `json:"id_cabang"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	Password string `json:"password"`
}

type loginInput struct {
	Nama     string `json:"nama"`
	Password string `json:"password"`
}

type changePasswordInput struct {
	IDUser          uint   `json:"id_user"`
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

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
	var input userInput

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

	if input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password wajib diisi"})
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

	passwordHash, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
		return
	}

	user := models.User{
		IDCabang:    input.IDCabang,
		Nama:        input.Nama,
		Role:        input.Role,
		PasswordHash: passwordHash,
	}

	config.DB.Create(&user)

	c.JSON(http.StatusOK, user)
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

	var input userInput

	// Bind data baru
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update data
	updates := models.User{
		IDCabang: input.IDCabang,
		Nama:     input.Nama,
		Role:     input.Role,
	}

	if input.Password != "" {
		passwordHash, err := utils.HashPassword(input.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
			return
		}
		updates.PasswordHash = passwordHash
	}

	config.DB.Model(&user).Updates(updates)

	c.JSON(http.StatusOK, user)
}

// LoginUser memvalidasi nama, role, dan password.
// Endpoint: POST /api/auth/login
func LoginUser(c *gin.Context) {
	var input loginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Nama == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama dan password wajib diisi"})
		return
	}

	var user models.User
	if err := config.DB.Where("LOWER(nama) = LOWER(?)", input.Nama).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if user.PasswordHash == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password belum diset untuk user ini"})
		return
	}

	if !utils.CheckPassword(user.PasswordHash, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password tidak valid"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// ChangePassword memperbarui password user dengan validasi password lama.
// Endpoint: POST /api/auth/change-password
func ChangePassword(c *gin.Context) {
	var input changePasswordInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IDUser == 0 || input.CurrentPassword == "" || input.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data password tidak lengkap"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, input.IDUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if user.PasswordHash == "" || !utils.CheckPassword(user.PasswordHash, input.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password lama tidak valid"})
		return
	}

	newHash, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
		return
	}

	config.DB.Model(&user).Update("password_hash", newHash)
	user.PasswordHash = ""
	user.IDUser = user.IDUser
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
