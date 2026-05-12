package models

type User struct {
	IDUser   uint   `gorm:"primaryKey" json:"id_user"`
	IDCabang uint   `json:"id_cabang"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	PasswordHash string `json:"-"`
}
