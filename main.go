package main

import (
	"errors"
	"log"

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
	config.DB.DisableForeignKeyConstraintWhenMigrating = true
	fixInvalidConstraints()

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
	ensurePesananAlokasiFK()
	ensureDetailAlokasiFK()
	ensureLogAlokasiFK()

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
		api.POST("/auth/reset-all-passwords", controllers.ResetAllPasswords)
		api.POST("/reseed-users", func(c *gin.Context) {
			if err := reseedUsers(); err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"message": "Reseed user selesai"})
		})

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

// fixInvalidConstraints membersihkan constraint yang salah arah dari migrasi lama.
func fixInvalidConstraints() {
	if config.DB == nil {
		return
	}

	const invalidPesananConstraint = "fk_alokasi_produksis_pesanan"
	const invalidDetailConstraint = "fk_detail_kebutuhan_bahans_alokasi"
	const invalidLogConstraint = "fk_log_kerja_karyawans_alokasi"
	const lookupSQL = `
		SELECT CONSTRAINT_NAME, TABLE_NAME
		FROM information_schema.REFERENTIAL_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
		AND (
			(CONSTRAINT_NAME = ?)
			OR (TABLE_NAME = 'pesanan_globals' AND REFERENCED_TABLE_NAME = 'alokasi_produksis')
			OR (TABLE_NAME = 'alokasi_produksis' AND REFERENCED_TABLE_NAME = 'detail_kebutuhan_bahans')
			OR (TABLE_NAME = 'alokasi_produksis' AND REFERENCED_TABLE_NAME = 'log_kerja_karyawans')
		)
	`

	type fkRow struct {
		ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
		TableName      string `gorm:"column:TABLE_NAME"`
	}

	var rows []fkRow
	if err := config.DB.Raw(lookupSQL, invalidPesananConstraint).Scan(&rows).Error; err != nil {
		log.Println("Lookup FK gagal:", err)
		return
	}

	for _, row := range rows {
		dropSQL := "ALTER TABLE " + row.TableName + " DROP FOREIGN KEY " + row.ConstraintName
		if err := config.DB.Exec(dropSQL).Error; err != nil {
			log.Println("Drop FK gagal:", err)
			continue
		}
		log.Println("Drop FK:", row.ConstraintName, "on", row.TableName)
	}

	var detailRows []fkRow
	if err := config.DB.Raw(lookupSQL, invalidDetailConstraint).Scan(&detailRows).Error; err != nil {
		log.Println("Lookup FK gagal:", err)
		return
	}

	for _, row := range detailRows {
		dropSQL := "ALTER TABLE " + row.TableName + " DROP FOREIGN KEY " + row.ConstraintName
		if err := config.DB.Exec(dropSQL).Error; err != nil {
			log.Println("Drop FK gagal:", err)
			continue
		}
		log.Println("Drop FK:", row.ConstraintName, "on", row.TableName)
	}

	var logRows []fkRow
	if err := config.DB.Raw(lookupSQL, invalidLogConstraint).Scan(&logRows).Error; err != nil {
		log.Println("Lookup FK gagal:", err)
		return
	}

	for _, row := range logRows {
		dropSQL := "ALTER TABLE " + row.TableName + " DROP FOREIGN KEY " + row.ConstraintName
		if err := config.DB.Exec(dropSQL).Error; err != nil {
			log.Println("Drop FK gagal:", err)
			continue
		}
		log.Println("Drop FK:", row.ConstraintName, "on", row.TableName)
	}
}

// ensurePesananAlokasiFK memastikan FK yang benar ada di alokasi_produksis.
func ensurePesananAlokasiFK() {
	if config.DB == nil {
		return
	}

	migrator := config.DB.Migrator()
	const fkName = "fk_alokasi_produksis_pesanan"
	if migrator.HasConstraint(&models.AlokasiProduksi{}, fkName) {
		return
	}

	addSQL := "ALTER TABLE alokasi_produksis ADD CONSTRAINT " + fkName +
		" FOREIGN KEY (id_pesanan) REFERENCES pesanan_globals(id_pesanan) ON DELETE CASCADE"
	if err := config.DB.Exec(addSQL).Error; err != nil {
		log.Println("Add FK gagal:", err)
		return
	}
	log.Println("Add FK:", fkName)
}

// ensureDetailAlokasiFK memastikan FK detail_kebutuhan_bahans -> alokasi_produksis.
func ensureDetailAlokasiFK() {
	if config.DB == nil {
		return
	}

	migrator := config.DB.Migrator()
	const fkName = "fk_detail_kebutuhan_bahans_alokasi"
	if migrator.HasConstraint(&models.DetailKebutuhanBahan{}, fkName) {
		return
	}

	addSQL := "ALTER TABLE detail_kebutuhan_bahans ADD CONSTRAINT " + fkName +
		" FOREIGN KEY (id_alokasi) REFERENCES alokasi_produksis(id_alokasi) ON DELETE CASCADE"
	if err := config.DB.Exec(addSQL).Error; err != nil {
		log.Println("Add FK gagal:", err)
		return
	}
	log.Println("Add FK:", fkName)
}

// ensureLogAlokasiFK memastikan FK log_kerja_karyawans -> alokasi_produksis.
func ensureLogAlokasiFK() {
	if config.DB == nil {
		return
	}

	migrator := config.DB.Migrator()
	const fkName = "fk_log_kerja_karyawans_alokasi"
	if migrator.HasConstraint(&models.LogKerjaKaryawan{}, fkName) {
		return
	}

	addSQL := "ALTER TABLE log_kerja_karyawans ADD CONSTRAINT " + fkName +
		" FOREIGN KEY (id_alokasi) REFERENCES alokasi_produksis(id_alokasi) ON DELETE CASCADE"
	if err := config.DB.Exec(addSQL).Error; err != nil {
		log.Println("Add FK gagal:", err)
		return
	}
	log.Println("Add FK:", fkName)
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

// reseedUsers menghapus data user lalu mengisi ulang data user default.
// Gunakan saat data user hilang, tanpa mengganggu data lainnya.
func reseedUsers() error {
	if config.DB == nil {
		return errors.New("database belum terkoneksi")
	}

	if err := config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.User{}).Error; err != nil {
		return err
	}

	seedInitialData()
	return nil
}
