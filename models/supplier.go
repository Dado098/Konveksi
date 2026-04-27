package models

type Supplier struct {
	IDSupplier     uint   `gorm:"primaryKey" json:"id_supplier"`
	NamaSupplier   string `json:"nama_supplier"`
	Alamat         string `json:"alamat"`
	NoHP           string `json:"no_hp"`
	Email          string `json:"email"`
	NamaPerusahaan string `json:"nama_perusahaan"`
}
