package main

import (
	"log"

	"jr-konveksi/config"
	"jr-konveksi/models"
	controllers "jr-konveksi/models/Controller"

	"github.com/gin-gonic/gin"
)

func main() {

	// Connect database
	config.ConnectDatabase()

	// Cek apakah DB nil
	if config.DB == nil {
		log.Fatal("Database belum terkoneksi")
	}

	log.Println("Starting AutoMigrate...")

	// Auto migrate semua tabel
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

	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "All Tables Migrated Successfully",
		})
	})

	// Define API routes
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
