package models

type DetailKebutuhanBahan struct {
	IDDetail       uint    `gorm:"primaryKey" json:"id_detail"`
	IDAlokasi      uint    `json:"id_alokasi"`
	IDBahan        uint    `json:"id_bahan"`
	QtyBahanPerPcs float64 `json:"qty_bahan_per_pcs"`
}
