package models

import "time"

type LogKerjaKaryawan struct {
	IDLog       uint      `gorm:"primaryKey" json:"id_log"`
	IDAlokasi   uint      `json:"id_alokasi"`
	IDUser      uint      `json:"id_user"`
	Tahapan     string    `json:"tahapan"`
	WaktuUpdate time.Time `gorm:"autoCreateTime" json:"waktu_update"`
}
