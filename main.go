package main

import (
	"log"
	"time"

	"jr-konveksi/config"
	"jr-konveksi/models"
	controllers "jr-konveksi/models/Controller"

	"github.com/gin-gonic/gin"
)

func main() {

	// 1) Inisialisasi koneksi database
	config.ConnectDatabase()

	// Validasi koneksi berhasil sebelum aplikasi berjalan lebih jauh
	if config.DB == nil {
		log.Fatal("Database belum terkoneksi")
	}

	log.Println("Starting AutoMigrate...")

	// 2) Auto migration agar struktur tabel sinkron dengan model terbaru
	err := config.DB.AutoMigrate(
		&models.Cabang{},
		&models.Supplier{},
		&models.BahanBaku{},
		&models.PesananGlobal{},
		&models.AlokasiProduksi{},
		&models.DetailKebutuhanBahan{},
		&models.User{},
		&models.LogKerjaKaryawan{},
	)

	if err != nil {
		log.Fatal("Migration Failed:", err)
	}

	log.Println("Migration Success")

	// 3) Seed data awal untuk memudahkan testing pertama kali
	seedInitialData()

	// 4) Inisialisasi router + middleware
	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "All Tables Migrated Successfully",
		})
	})

	// 5) Registrasi endpoint API per modul
	api := r.Group("/api")
	{
		// CABANG
		api.GET("/cabang", controllers.GetCabang)
		api.POST("/cabang", controllers.CreateCabang)
		api.PUT("/cabang/:id", controllers.UpdateCabang)
		api.DELETE("/cabang/:id", controllers.DeleteCabang)

		// BAHAN
		api.GET("/bahan", controllers.GetBahan)
		api.POST("/bahan", controllers.CreateBahan)
		api.PUT("/bahan/:id", controllers.UpdateBahan)
		api.DELETE("/bahan/:id", controllers.DeleteBahan)

		// SUPPLIER
		api.GET("/supplier", controllers.GetSupplier)
		api.GET("/supplier/:id", controllers.GetSupplierByID)
		api.POST("/supplier", controllers.CreateSupplier)
		api.PUT("/supplier/:id", controllers.UpdateSupplier)
		api.DELETE("/supplier/:id", controllers.DeleteSupplier)

		// PESANAN
		api.GET("/pesanan", controllers.GetPesanan)
		api.POST("/pesanan", controllers.CreatePesanan)
		api.PUT("/pesanan/:id", controllers.UpdatePesanan)
		api.DELETE("/pesanan/:id", controllers.DeletePesanan)

		// ALOKASI PRODUKSI
		api.GET("/alokasi", controllers.GetAlokasi)
		api.POST("/alokasi", controllers.CreateAlokasi)
		api.PUT("/alokasi/:id", controllers.UpdateAlokasi)
		api.DELETE("/alokasi/:id", controllers.DeleteAlokasi)

		// DETAIL KEBUTUHAN BAHAN
		api.GET("/detail_kebutuhan_bahan", controllers.GetDetailBahan)
		api.POST("/detail_kebutuhan_bahan", controllers.CreateDetailBahan)
		api.PUT("/detail_kebutuhan_bahan/:id", controllers.UpdateDetailBahan)
		api.DELETE("/detail_kebutuhan_bahan/:id", controllers.DeleteDetailBahan)

		// USER
		api.GET("/user", controllers.GetUser)
		api.POST("/user", controllers.CreateUser)
		api.PUT("/user/:id", controllers.UpdateUser)
		api.DELETE("/user/:id", controllers.DeleteUser)

		// LOG KERJA
		api.GET("/log", controllers.GetLog)
		api.POST("/log", controllers.CreateLog)
		api.DELETE("/log/:id", controllers.DeleteLog)

	}

	r.Run(":3000")
}

// corsMiddleware mengizinkan frontend Vite mengakses API backend.
// Middleware ini juga menangani preflight request (OPTIONS).
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// seedInitialData mengisi data default bila tabel masih kosong.
// Tujuannya agar sistem bisa langsung dipakai untuk demo/testing,
// terutama untuk proses login dan dashboard awal.
func seedInitialData() {
	var cabangCount int64
	config.DB.Model(&models.Cabang{}).Count(&cabangCount)

	if cabangCount == 0 {
		config.DB.Create(&models.Cabang{NamaCabang: "Cabang Utama", Lokasi: "Jakarta"})
		config.DB.Create(&models.Cabang{NamaCabang: "Cabang Bandung", Lokasi: "Bandung"})
	}

	var firstCabang models.Cabang
	if err := config.DB.First(&firstCabang).Error; err != nil {
		log.Println("Seed skipped: cabang belum tersedia")
		return
	}

	var userCount int64
	config.DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Sutianto", Role: "owner"})
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Admin Konveksi", Role: "admin"})
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Operator 1", Role: "karyawan"})
	}

	var supplierCount int64
	config.DB.Model(&models.Supplier{}).Count(&supplierCount)
	if supplierCount == 0 {
		config.DB.Create(&models.Supplier{
			NamaSupplier:   "PT Tekstil Nusantara",
			Alamat:         "Jl. Industri 1",
			NoHP:           "081234567890",
			Email:          "cs@tekstilnusantara.id",
			NamaPerusahaan: "Tekstil Nusantara",
		})
	}

	var supplier models.Supplier
	config.DB.First(&supplier)

	var bahanCount int64
	config.DB.Model(&models.BahanBaku{}).Count(&bahanCount)
	if bahanCount == 0 && supplier.IDSupplier != 0 {
		config.DB.Create(&models.BahanBaku{IDCabang: firstCabang.IDCabang, IDSupplier: supplier.IDSupplier, NamaBahan: "Cotton Combed", StokAktual: 1234, BatasMinimum: 200})
		config.DB.Create(&models.BahanBaku{IDCabang: firstCabang.IDCabang, IDSupplier: supplier.IDSupplier, NamaBahan: "American Drill", StokAktual: 456, BatasMinimum: 500})
	}

	var pesananCount int64
	config.DB.Model(&models.PesananGlobal{}).Count(&pesananCount)
	if pesananCount == 0 {
		config.DB.Create(&models.PesananGlobal{
			NamaPesanan:  "Alvidiano",
			TotalQty:     1234,
			TglDeadline:  time.Now().AddDate(0, 1, 0),
			StatusGlobal: "Proses",
		})
	}

	var pesanan models.PesananGlobal
	config.DB.First(&pesanan)

	var alokasiCount int64
	config.DB.Model(&models.AlokasiProduksi{}).Count(&alokasiCount)
	if alokasiCount == 0 && pesanan.IDPesanan != 0 {
		config.DB.Create(&models.AlokasiProduksi{IDPesanan: pesanan.IDPesanan, IDCabang: firstCabang.IDCabang, QtyAlokasi: 500, StatusLokal: "Proses"})
	}

	var alokasi models.AlokasiProduksi
	config.DB.First(&alokasi)

	var bahan models.BahanBaku
	config.DB.First(&bahan)

	var detailCount int64
	config.DB.Model(&models.DetailKebutuhanBahan{}).Count(&detailCount)
	if detailCount == 0 && alokasi.IDAlokasi != 0 && bahan.IDBahan != 0 {
		config.DB.Create(&models.DetailKebutuhanBahan{IDAlokasi: alokasi.IDAlokasi, IDBahan: bahan.IDBahan, QtyBahanPerPcs: 0.5})
	}

	var logCount int64
	config.DB.Model(&models.LogKerjaKaryawan{}).Count(&logCount)
	if logCount == 0 && alokasi.IDAlokasi != 0 {
		var firstUser models.User
		config.DB.First(&firstUser)
		if firstUser.IDUser != 0 {
			config.DB.Create(&models.LogKerjaKaryawan{IDAlokasi: alokasi.IDAlokasi, IDUser: firstUser.IDUser, Tahapan: "Tambah"})
		}
	}

	log.Println("Seed check completed")
}
