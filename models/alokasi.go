package models

type AlokasiProduksi struct {
	IDAlokasi   uint   `gorm:"primaryKey" json:"id_alokasi"`
	IDPesanan   uint   `json:"id_pesanan"`
	IDCabang    uint   `json:"id_cabang"`
	QtyAlokasi  int    `json:"qty_alokasi"`
	StatusLokal string `json:"status_lokal"`
}
