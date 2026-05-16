package models

import "time"

type PesananGlobal struct {
	IDPesanan    uint      `gorm:"primaryKey" json:"id_pesanan"`
	NamaPesanan  string    `json:"nama_pesanan"`
	TotalQty     int       `json:"total_qty"`
	HargaFlat    float64   `json:"harga_flat"`
	TotalHarga   float64   `json:"total_harga"`
	Bayar        float64   `json:"bayar"`
	TglDeadline  time.Time `json:"tgl_deadline"`
	StatusGlobal string    `json:"status_global"`
	Alokasi      []AlokasiProduksi `gorm:"foreignKey:IDPesanan;references:IDPesanan;constraint:OnDelete:CASCADE" json:"-"`
}
