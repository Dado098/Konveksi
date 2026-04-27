package models

type Cabang struct {
	IDCabang   uint   `gorm:"primaryKey" json:"id_cabang"`
	NamaCabang string `json:"nama_cabang"`
	Lokasi     string `json:"lokasi"`
}
