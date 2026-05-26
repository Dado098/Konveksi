package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// ConnectDatabase membuat koneksi database utama aplikasi.
// Prioritas konfigurasi:
// 1) DB_DSN (full DSN dari environment)
// 2) Kombinasi DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME
// Fungsi ini juga melakukan ping untuk memastikan koneksi benar-benar aktif.
func ConnectDatabase() {
	dsn := buildDSN()

	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("Database instance setup failed: %v", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	DB = database
}

// buildDSN membentuk DSN MySQL dari environment variable.
// Jika DB_DSN tersedia, nilai tersebut dipakai langsung agar fleksibel
// untuk berbagai environment (local, staging, production).
func buildDSN() string {
	if envDSN := os.Getenv("DB_DSN"); envDSN != "" {
		return envDSN
	}

	user := getEnv("DB_USER", "root")
	password := os.Getenv("LivAiuaLaybTDZDnpNFmpFqQkjMezhWA")
	host := getEnv("DB_HOST", "tramway.proxy.rlwy.net")
	port := getEnv("DB_PORT", "58900")
	name := getEnv("DB_NAME", "railway")

	return fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user,
		password,
		host,
		port,
		name,
	)
}

// getEnv mengembalikan nilai environment variable,
// atau fallback jika variabel belum diset.
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
