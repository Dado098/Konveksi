package models

import "time"

type PesananGlobal struct {
	IDPesanan    uint      `gorm:"primaryKey" json:"id_pesanan"`
	NamaPesanan  string    `json:"nama_pesanan"`
	TotalQty     int       `json:"total_qty"`
	TglDeadline  time.Time `json:"tgl_deadline"`
	StatusGlobal string    `json:"status_global"`
}
