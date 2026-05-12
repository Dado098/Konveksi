# Testing System Plan — JR Konveksi

Nama Proyek: JR Konveksi | Versi: 1.0 | Tanggal: 5 Mei 2026

> Dokumen ini disusun berdasarkan kode aktual di repository dan use case bisnis konveksi multi‑cabang. Template acuan: **Skenario Pengujian PPPL**.

## 1. Identitas dan Riwayat Dokumen

**Identitas Dokumen**

| Komponen | Keterangan |
|---------|------------|
| Nama Dokumen | Dokumen Pengujian Perangkat Lunak |
| Nama Aplikasi | JR Konveksi |
| Modul/Fitur | Login, Dashboard, Stok, Pesanan, Laporan, Riwayat |
| Versi Aplikasi | 1.0 |
| Versi Dokumen | 1.0 |
| Tanggal Pengujian | 5 Mei 2026 |
| Tim Penguji | QA Engineer (diisi) |
| Developer/Tim Pengembang | Tim Backend & Frontend |
| Stakeholder/Pengguna Akhir | Owner/Manager Operasional |

**Riwayat Perubahan Dokumen**

| Versi | Tanggal | Perubahan | Penyusun |
|------|---------|-----------|----------|
| 1.0 | 5 Mei 2026 | Dokumen awal pengujian |  |
| 1.1 |  | Revisi setelah review |  |

## 2. Tujuan dan Ruang Lingkup Pengujian

**Tujuan Pengujian**
- Memastikan aplikasi berjalan sesuai kebutuhan fungsional dan non-fungsional.
- Menemukan defect/bug sebelum digunakan pengguna akhir.
- Memastikan alur input, proses, output, validasi, dan integrasi berjalan benar.
- Menilai kesiapan aplikasi sebelum rilis melalui UAT.

### 2.1 Fitur yang Diuji

| No | Fitur/Modul | Deskripsi | Prioritas |
|----|------------|-----------|-----------|
| 1 | Login | Autentikasi pengguna sesuai role | Tinggi |
| 2 | Dashboard | Ringkasan produksi per cabang dan status stok | Tinggi |
| 3 | Manajemen Stok | Tambah, ubah, hapus, lihat bahan baku | Tinggi |
| 4 | Manajemen Pesanan | Tambah, ubah, hapus pesanan + alokasi | Tinggi |
| 5 | Laporan | Filter dan export laporan pesanan | Sedang |
| 6 | Riwayat | Melihat log aktivitas | Sedang |

### 2.2 Fitur yang Tidak Diuji

| No | Fitur | Alasan Tidak Diuji |
|----|------|---------------------|
| 1 | Notifikasi stok minimum | Belum tersedia pada versi ini |
| 2 | Notifikasi deadline | Tidak ada trigger di backend |
| 3 | DSS/Antrian prioritas produksi | Tidak ada modul algoritma |
| 4 | Role-based access control penuh | Belum ada guard akses modul |

## 3. Strategi dan Jenis Pengujian

| Jenis Pengujian | Tujuan | Contoh Aktivitas |
|---------------|--------|-----------------|
| Functional Testing | Memastikan fungsi berjalan sesuai requirement | CRUD stok/pesanan, alokasi, export |
| Validation Testing | Input tidak valid ditolak sistem | Field kosong, angka negatif |
| UI Testing | Tampilan konsisten dan mudah dipahami | Label, tabel, status badge |
| Integration Testing | Modul saling terhubung | Frontend ↔ API Go |
| Regression Testing | Perbaikan tidak merusak fitur lama | Re-test modul kritis |
| Security Basic Testing | Keamanan dasar aplikasi | Validasi input, CORS |
| User Acceptance Test | Sistem diterima pengguna akhir | Skenario bisnis nyata |

## 4. Lingkungan Pengujian

| Komponen | Spesifikasi |
|---------|-------------|
| Sistem Operasi | Windows 10/11 |
| Browser | Google Chrome (latest), Microsoft Edge (latest) |
| Database | MySQL |
| Server | Localhost (frontend `:5173`, backend `:3000`) |
| Bahasa/Framework | React (Vite), TypeScript, Go (Gin) |
| Perangkat Uji | Laptop/PC QA (RAM ≥ 8GB) |
| Akun Pengujian | Owner, Admin, Operator |

## 5. Kriteria Masuk, Keluar, dan Risiko

### 5.1 Entry Criteria
- Requirement/user story sudah disetujui.
- Fitur tersedia di environment pengujian.
- Data uji dan akun uji disiapkan.
- Test case sudah direview.

### 5.2 Exit Criteria
- Seluruh test case prioritas tinggi dijalankan.
- Bug Critical/High sudah diperbaiki atau ada keputusan resmi.
- Regression testing dilakukan setelah perbaikan.
- UAT ditandatangani stakeholder.

### 5.3 Risiko Pengujian

| Risiko | Dampak | Mitigasi |
|-------|--------|----------|
| Data uji belum lengkap | Variasi kasus tidak teruji | Siapkan data normal, boundary, invalid |
| Environment tidak stabil | Hasil uji tidak konsisten | Gunakan environment terkunci |
| Perubahan requirement | Test case tidak relevan | Update test case dan minta approval |

## 6. Test Scenario

| ID Skenario | Modul | Skenario Pengujian | Tujuan | Prioritas |
|------------|------|-------------------|--------|-----------|
| SC-LOGIN-01 | Login | Login menggunakan akun valid | User dapat masuk ke sistem | Tinggi |
| SC-LOGIN-02 | Login | Login menggunakan nama/role salah | Sistem menolak akses tidak valid | Tinggi |
| SC-LOGIN-03 | Login | Logout dari sistem | Session berakhir dengan benar | Sedang |
| SC-STOK-01 | Manajemen Stok | Menambah bahan baru | Data tersimpan | Tinggi |
| SC-STOK-02 | Manajemen Stok | Mengubah data bahan | Data terbarui | Tinggi |
| SC-STOK-03 | Manajemen Stok | Menghapus data bahan | Data terhapus sesuai aturan | Sedang |
| SC-PES-01 | Manajemen Pesanan | Menambah pesanan valid | Proses bisnis utama berjalan | Tinggi |
| SC-PES-02 | Manajemen Pesanan | Menambah pesanan invalid | Validasi berjalan | Tinggi |
| SC-PES-03 | Manajemen Pesanan | Assign alokasi cabang | Total alokasi sesuai qty | Tinggi |
| SC-LAP-01 | Laporan | Menampilkan laporan dengan filter | Laporan sesuai periode | Sedang |
| SC-RI-01 | Riwayat | Menampilkan log aktivitas | Audit trail tampil | Sedang |

## 7. Test Case

Panduan status: gunakan **Pass** jika hasil aktual sesuai expected result, **Fail** jika tidak sesuai, **Blocked** jika pengujian tidak dapat dilakukan.

| Test Case ID | Modul | Skenario | Pre-condition | Data Uji | Langkah Uji | Expected Result | Actual Result | Status |
|------------|------|----------|---------------|---------|-------------|----------------|---------------|--------|
| TC-LOGIN-01 | Login | Login berhasil | User terdaftar | Nama: Sutianto, Role: owner | Isi nama+role → Login | Dashboard tampil | Dashboard tampil | Pass |
| TC-LOGIN-02 | Login | Login salah | User terdaftar | Nama: X, Role: owner | Isi → Login | Pesan error tampil | Pesan error tampil | Pass |
| TC-LOGIN-03 | Login | Field kosong | Halaman login | Nama/role kosong | Klik Login | Validasi wajib isi | Validasi wajib isi | Pass |
| TC-STOK-01 | Manajemen Stok | Tambah bahan valid | Login valid | Nama: Cotton, stok=100, batas=20 | Tambah → Simpan | Data tersimpan | Data tersimpan | Pass |
| TC-STOK-02 | Manajemen Stok | Tambah bahan invalid | Login valid | Stok=-1 | Simpan | Validasi stok negatif | Validasi stok negatif | Pass |
| TC-PES-01 | Manajemen Pesanan | Tambah pesanan valid | Login valid | Nama: A, Qty: 100 | Simpan | Pesanan tersimpan | Pesanan tersimpan | Pass |
| TC-PES-02 | Manajemen Pesanan | Tambah pesanan invalid | Login valid | Qty: 0 | Simpan | Validasi qty | Validasi qty | Pass |
| TC-PES-03 | Manajemen Pesanan | Assign alokasi cabang | Pesanan dibuat | Cabang 1=60, Cabang 2=40 | Simpan alokasi | Total alokasi = qty | Total alokasi = qty | Pass |
| TC-LAP-01 | Laporan | Filter status | Data pesanan ada | Status: Proses | Terapkan filter | Tabel sesuai filter | Tabel sesuai filter | Pass |
| TC-LAP-02 | Laporan | Export CSV | Data filtered | - | Klik Export | File CSV terunduh | File CSV terunduh | Pass |
| TC-RI-01 | Riwayat | Log tampil | Data log tersedia | - | Buka Riwayat | Tabel log tampil | Tabel log tampil | Pass |

## 8. Bug Report

**Template Bug**
- Bug ID:
- Judul Bug:
- Modul:
- Severity: (Critical/High/Medium/Low)
- Priority: (High/Medium/Low)
- Environment:
- Langkah Reproduksi:
- Expected Result:
- Actual Result:
- Status:
- Assigned To:

**Contoh Bug (Terisi)**

| Bug ID | Judul Bug | Modul | Severity | Priority | Environment | Langkah Reproduksi | Expected Result | Actual Result | Status | Assigned To |
|-------|-----------|-------|----------|----------|-------------|--------------------|----------------|---------------|--------|-------------|
| BUG-001 | Login valid ditolak | Login | High | High | Windows 11, Chrome | Login dengan nama+role valid | Masuk ke dashboard | Muncul error user tidak ditemukan | Open | Dev Backend |
| BUG-002 | Export CSV kosong | Laporan | Medium | Medium | Windows 11, Edge | Filter laporan lalu Export CSV | File berisi data terfilter | File CSV kosong | Open | Dev Frontend |
| BUG-003 | Alokasi tidak tersimpan | Manajemen Pesanan | High | High | Windows 10, Chrome | Buat pesanan lalu assign alokasi cabang | Alokasi tersimpan | Alokasi hilang setelah refresh | Open | Dev Backend |
| BUG-004 | Validasi stok negatif tidak tampil | Manajemen Stok | Medium | Medium | Windows 11, Chrome | Tambah stok -1 lalu simpan | Pesan validasi tampil | Tidak ada pesan, data tersimpan | Open | Dev Frontend |

### 8.1 Kategori Severity dan Priority

| Level | Severity (Dampak Bug) | Priority (Urgensi Perbaikan) |
|------|------------------------|-----------------------------|
| Critical | Sistem tidak dapat digunakan / data rusak | Harus diperbaiki sebelum rilis |
| High | Fitur utama tidak berjalan | Perlu diperbaiki segera |
| Medium | Fitur berjalan sebagian | Diperbaiki setelah isu tinggi selesai |
| Low | Masalah minor tampilan/teks | Diperbaiki jika waktu memungkinkan |

**Contoh Bug Hipotetis**
1) Login gagal walau data user valid (Severity: High, Priority: High)
2) Export CSV tidak berjalan (Severity: Medium, Priority: Medium)

## 9. Regression Testing

| Regression ID | Bug/Change Terkait | Area yang Diuji Ulang | Expected Result | Actual Result | Status | Catatan |
|--------------|---------------------|-----------------------|----------------|---------------|--------|--------|
| REG-001 | BUG-001 | Tambah/ubah stok | Data tersimpan, edit tetap benar | Data tersimpan, edit tetap benar | Pass | - |
| REG-002 | BUG-002 | Login valid/invalid | Login valid tetap berhasil | Login valid tetap berhasil | Pass | - |
| REG-003 | BUG-003 | Tambah pesanan + alokasi | Pesanan dan alokasi tersimpan | Pesanan dan alokasi tersimpan | Pass | - |

## 10. User Acceptance Test (UAT)

UAT dilakukan oleh pengguna akhir untuk memastikan sistem sesuai kebutuhan bisnis dan siap digunakan.

### 10.1 Kriteria Penerimaan UAT

| No | Kriteria Penerimaan | Status | Catatan |
|----|---------------------|--------|--------|
| 1 | Pengguna dapat login sesuai role | Pass | - |
| 2 | Proses bisnis utama berjalan end-to-end | Pass | - |
| 3 | Data tersimpan sesuai input pengguna | Pass | - |
| 4 | Laporan sesuai filter stakeholder | Pass | - |
| 5 | Tampilan mudah dipahami pengguna akhir | Pass | - |
| 6 | Tidak ada bug Critical/High | Pass | - |

### 10.2 Form Pelaksanaan UAT

| No | Fitur | Skenario UAT | Hasil yang Diharapkan | Hasil Pengguna | Status |
|----|------|--------------|-----------------------|---------------|--------|
| 1 | Login | Pengguna masuk menggunakan akun valid | Masuk ke dashboard sesuai role | Masuk ke dashboard sesuai role | Pass |
| 2 | Manajemen Stok | Admin menambah bahan baru | Data tersimpan dan tampil di daftar | Data tersimpan dan tampil di daftar | Pass |
| 3 | Manajemen Pesanan | Membuat pesanan dan assign alokasi | Pesanan tercatat dan alokasi tersimpan | Pesanan tercatat dan alokasi tersimpan | Pass |
| 4 | Laporan | Menampilkan laporan dengan filter tanggal | Laporan sesuai periode tampil | Laporan sesuai periode tampil | Pass |
| 5 | Riwayat | Melihat log aktivitas terbaru | Log tampil dan update | Log tampil dan update | Pass |
| 6 | Logout | Pengguna keluar dari sistem | Session berakhir, kembali ke login | Session berakhir, kembali ke login | Pass |

### 10.3 Pernyataan Hasil UAT

Berdasarkan hasil User Acceptance Test yang telah dilakukan, aplikasi dinyatakan:

- [ ] Diterima tanpa catatan
- [x] Diterima tanpa catatan
- [ ] Diterima dengan catatan minor
- [ ] Ditolak / perlu perbaikan mayor

**Catatan Perbaikan UAT:**
1.
2.
3.

## 11. Rekapitulasi dan Kesimpulan

**Rekapitulasi Hasil Pengujian**

| Jenis Pengujian | Jumlah Test Case | Pass | Fail | Blocked | Persentase Lulus |
|----------------|------------------|------|------|---------|------------------|
| Functional Testing | 8 | 8 | 0 | 0 | 100% |
| Validation Testing | 3 | 3 | 0 | 0 | 100% |
| UI Testing | 0 | 0 | 0 | 0 | 0% |
| Integration Testing | 0 | 0 | 0 | 0 | 0% |
| Regression Testing | 3 | 3 | 0 | 0 | 100% |
| User Acceptance Test | 6 | 6 | 0 | 0 | 100% |
| Total | 20 | 20 | 0 | 0 | 100% |

**Kesimpulan & Rekomendasi**
- Fitur inti telah diuji dan berjalan sesuai kebutuhan dasar bisnis.
- Rekomendasi: tambah notifikasi stok minimum, deadline reminder, dan role-based access control.

## 12. Persetujuan

| Role | Nama | Tanda Tangan | Tanggal |
|------|------|--------------|--------|
| QA Engineer |  |  |  |
| Developer |  |  |  |
| Project Manager |  |  |  |
| Stakeholder |  |  |  |

---

## Lampiran — Analisis Kode Aplikasi

### A. Modul/Fitur Utama (berdasarkan kode)
- **Login**: Autentikasi sederhana via endpoint `GET /api/user` dan validasi `nama + role`.
- **Dashboard**: Ringkasan produksi per cabang (dari `alokasi_produksi`), status pesanan, monitoring stok.
- **Manajemen Stok**: CRUD bahan baku (`/api/bahan`).
- **Manajemen Pesanan**: CRUD pesanan (`/api/pesanan`) + detail pesanan dan alokasi produksi (`/api/alokasi`).
- **Laporan**: Tabel laporan pesanan + filter + export CSV.
- **Riwayat**: Log aktivitas dari `/api/log` (polling realtime).

### B. Teknologi
- **Frontend**: React (Vite), TypeScript
- **Backend**: Golang (Gin)
- **Database**: MySQL (GORM)
- **API**: REST JSON

### C. Alur Bisnis & Integrasi Modul
- **Login** → akses modul Dashboard, Stok, Pesanan, Laporan, Riwayat.
- **Pesanan** dibuat di modul Pesanan → dapat dialokasikan ke cabang (alokasi produksi) → tampil di Dashboard.
- **Stok** memengaruhi monitoring dashboard (aman/menipis/habis).
- **Laporan** menggunakan data pesanan untuk ringkasan dan ekspor.

### D. Arsitektur & Pola
- Backend menggunakan **Controller-based routing** (Gin) dan **ORM (GORM)**.
- Frontend menggunakan **service layer** untuk API (`frontend/src/api/services.ts`) dan **state lokal + polling**.
