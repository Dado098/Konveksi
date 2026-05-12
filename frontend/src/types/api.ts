export type Role = 'owner' | 'admin' | 'karyawan'

export interface Cabang {
  id_cabang: number
  nama_cabang: string
  lokasi: string
}

export interface Supplier {
  id_supplier: number
  nama_supplier: string
  alamat: string
  no_hp: string
  email: string
  nama_perusahaan: string
}

export interface BahanBaku {
  id_bahan: number
  id_cabang: number
  id_supplier: number
  nama_bahan: string
  stok_aktual: number
  batas_minimum: number
}

export interface Pesanan {
  id_pesanan: number
  nama_pesanan: string
  total_qty: number
  harga_flat: number
  total_harga?: number
  bayar: number
  tgl_deadline: string
  status_global: string
}

export interface AlokasiProduksi {
  id_alokasi: number
  id_pesanan: number
  id_cabang: number
  qty_alokasi: number
  status_lokal: string
}

export interface DetailKebutuhanBahan {
  id_detail: number
  id_alokasi: number
  id_bahan: number
  qty_bahan_per_pcs: number
}

export interface User {
  id_user: number
  id_cabang: number
  nama: string
  role: Role
}

export interface AuthLoginRequest {
  nama: string
  password: string
}

export interface ChangePasswordRequest {
  id_user: number
  current_password: string
  new_password: string
}

export interface LogKerja {
  id_log: number
  id_alokasi: number
  id_user: number
  id_cabang: number
  tahapan: string
  waktu_update: string
}

export interface ApiError {
  error: string
}
