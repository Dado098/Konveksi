package models

type BahanBaku struct {
	IDBahan      uint    `gorm:"primaryKey" json:"id_bahan"`
	IDCabang     uint    `json:"id_cabang"`
	IDSupplier   uint    `json:"id_supplier"`
	NamaBahan    string  `json:"nama_bahan"`
	StokAktual   float64 `json:"stok_aktual"`
	BatasMinimum float64 `json:"batas_minimum"`
}
