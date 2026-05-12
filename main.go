package main

import (
	"errors"
	"log"
	"time"

	"jr-konveksi/config"
	"jr-konveksi/models"
	controllers "jr-konveksi/models/Controller"
	"jr-konveksi/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
		api.POST("/auth/login", controllers.LoginUser)
		api.POST("/auth/change-password", controllers.ChangePassword)

		// LOG KERJA
		api.GET("/log", controllers.GetLog)
		api.POST("/log", controllers.CreateLog)
		api.DELETE("/log", controllers.ClearLog)
		api.DELETE("/log/:id", controllers.DeleteLog)

		// RESEED DATA (DEV ONLY)
		api.POST("/reseed", func(c *gin.Context) {
			if err := reseedDatabase(); err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"message": "Reseed selesai"})
		})

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
	defaultPassword, err := utils.HashPassword("konveksi123")
	if err != nil {
		log.Println("Seed skipped: gagal hash password")
		return
	}
	if userCount == 0 {
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Sutianto", Role: "owner", PasswordHash: defaultPassword})
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Admin Konveksi", Role: "admin", PasswordHash: defaultPassword})
		config.DB.Create(&models.User{IDCabang: firstCabang.IDCabang, Nama: "Operator 1", Role: "karyawan", PasswordHash: defaultPassword})
	} else {
		config.DB.Model(&models.User{}).
			Where("password_hash = '' OR password_hash IS NULL").
			Update("password_hash", defaultPassword)
	}

	var supplierCount int64
	config.DB.Model(&models.Supplier{}).Count(&supplierCount)
	if supplierCount == 0 {
		config.DB.Create(&models.Supplier{
			NamaSupplier:   "Disediakan Klien",
			Alamat:         "-",
			NoHP:           "-",
			Email:          "-",
			NamaPerusahaan: "Klien",
		})
		config.DB.Create(&models.Supplier{
			NamaSupplier:   "Disediakan Konveksi",
			Alamat:         "-",
			NoHP:           "-",
			Email:          "-",
			NamaPerusahaan: "JR Konveksi",
		})
	}

	var supplierOptionCount int64
	config.DB.Model(&models.Supplier{}).
		Where("nama_supplier IN ?", []string{"Disediakan Klien", "Disediakan Konveksi"}).
		Count(&supplierOptionCount)
	if supplierOptionCount < 2 {
		config.DB.FirstOrCreate(&models.Supplier{NamaSupplier: "Disediakan Klien"}, &models.Supplier{
			NamaSupplier:   "Disediakan Klien",
			Alamat:         "-",
			NoHP:           "-",
			Email:          "-",
			NamaPerusahaan: "Klien",
		})
		config.DB.FirstOrCreate(&models.Supplier{NamaSupplier: "Disediakan Konveksi"}, &models.Supplier{
			NamaSupplier:   "Disediakan Konveksi",
			Alamat:         "-",
			NoHP:           "-",
			Email:          "-",
			NamaPerusahaan: "JR Konveksi",
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

// reseedDatabase menghapus seluruh data lalu mengisi ulang seed.
// Gunakan hanya untuk kebutuhan demo/testing.
func reseedDatabase() error {
	if config.DB == nil {
		return errors.New("database belum terkoneksi")
	}

	deleteAll := func(model interface{}) error {
		return config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(model).Error
	}

	if err := deleteAll(&models.LogKerjaKaryawan{}); err != nil {
		return err
	}
	if err := deleteAll(&models.DetailKebutuhanBahan{}); err != nil {
		return err
	}
	if err := deleteAll(&models.AlokasiProduksi{}); err != nil {
		return err
	}
	if err := deleteAll(&models.PesananGlobal{}); err != nil {
		return err
	}
	if err := deleteAll(&models.BahanBaku{}); err != nil {
		return err
	}
	if err := deleteAll(&models.Supplier{}); err != nil {
		return err
	}
	if err := deleteAll(&models.User{}); err != nil {
		return err
	}
	if err := deleteAll(&models.Cabang{}); err != nil {
		return err
	}

	seedInitialData()
	return nil
}
