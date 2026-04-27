# Frontend JR Konveksi

Frontend ini dibuat dengan React + TypeScript + Vite dan sudah terintegrasi dengan backend Golang pada repository yang sama.

## Fitur yang Diimplementasikan

- Login/auth berbasis data `User` dari endpoint backend (`/api/user`)
- Dashboard monitoring produksi & stok (termasuk polling realtime periodik)
- Manajemen stok bahan baku (`GET/POST/PUT/DELETE /api/bahan`)
- Manajemen pesanan (`GET/POST/PUT/DELETE /api/pesanan`)
- Detail pesanan berbasis relasi data alokasi (`GET /api/alokasi`)
- Laporan dengan filter status/tanggal + export CSV
- Riwayat aktivitas dari endpoint log (`GET /api/log`) dengan polling realtime

## Struktur Singkat

```text
src/
  api/            # Axios client + service endpoint backend
  components/     # Layout, UI reusable, route guard
  context/        # Auth context
  hooks/          # Hook realtime polling
  pages/          # Semua halaman sesuai desain
  types/          # TypeScript type dari kontrak backend
  utils/          # Helper format/status
```

## Endpoint Backend yang Digunakan

- `GET /api/user` untuk autentikasi frontend (lookup nama + role)
- `GET /api/cabang`
- `GET /api/supplier`
- `GET/POST/PUT/DELETE /api/bahan`
- `GET/POST/PUT/DELETE /api/pesanan`
- `GET /api/alokasi`
- `GET /api/detail_kebutuhan_bahan`
- `GET /api/log`

> Catatan: backend saat ini belum memiliki endpoint login/token dedicated. Implementasi auth frontend menggunakan validasi user dari endpoint `GET /api/user` dan session lokal (`localStorage`).

## Menjalankan Frontend

1. Pastikan backend Golang sudah berjalan di port `3000`.
2. Salin file env:

```bat
copy .env.example .env
```

3. Install dependency dan jalankan:

```bash
npm install
npm run dev
```

4. Build production:

```bash
npm run build
```

## Konfigurasi Environment

- `VITE_API_BASE_URL` default: `http://localhost:3000/api`

## Validasi Frontend Selaras Backend

Validasi di form mengikuti controller backend:

- `bahan.nama_bahan` wajib
- `bahan.stok_aktual >= 0`
- `pesanan.nama_pesanan` wajib
- `pesanan.total_qty > 0`
- `user.role` dibatasi `owner | admin | karyawan`

Semua error response backend (`{ error: string }`) ditampilkan ke user secara langsung dan user-friendly.
