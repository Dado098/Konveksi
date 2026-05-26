import { Download, Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, Modal, StatusPill } from '../components/UI'
import { useAuth } from '../context/useAuth'
import type { BahanBaku, Cabang, Supplier } from '../types/api'
import { confirmDanger, showError, showSuccess } from '../utils/alerts'

interface BahanForm {
  nama_bahan: string
  stok_aktual: number
  batas_minimum: number
  id_cabang: number
  id_supplier: number
}

const initialForm: BahanForm = {
  nama_bahan: '',
  stok_aktual: 0,
  batas_minimum: 0,
  id_cabang: 1,
  id_supplier: 1,
}

export const StockPage = () => {
  // State utama: data bahan, cabang, supplier, serta form modal
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [cabang, setCabang] = useState<Cabang[]>([])
  const [supplier, setSupplier] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BahanBaku | null>(null)
  const [form, setForm] = useState<BahanForm>(initialForm)
  useAuth()

  // loadData mengambil data master yang dipakai pada tabel dan dropdown
  const loadData = useCallback(async () => {
    try {
      const [bahanData, cabangData, supplierData] = await Promise.all([
        api.getBahan(),
        api.getCabang(),
        api.getSupplier(),
      ])
      setBahan(bahanData)
      setCabang(cabangData)
      setSupplier(supplierData)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  // openCreate menyiapkan form kosong untuk tambah bahan
  const openCreate = () => {
    setEditing(null)
    setForm({
      ...initialForm,
      id_cabang: cabang[0]?.id_cabang ?? 1,
      id_supplier: supplierOptions[0]?.id_supplier ?? 1,
    })
    setOpen(true)
  }

  // openEdit mengisi form dengan data existing untuk diubah
  const openEdit = (item: BahanBaku) => {
    setEditing(item)
    setForm({
      nama_bahan: item.nama_bahan,
      stok_aktual: item.stok_aktual,
      batas_minimum: item.batas_minimum,
      id_cabang: item.id_cabang,
      id_supplier: item.id_supplier,
    })
    setOpen(true)
  }

  // submit mengirim data ke backend (create atau update)
  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = form.nama_bahan.trim()
    const stokAktual = Number(form.stok_aktual)
    const batasMinimum = Number(form.batas_minimum)

    if (!trimmedName) {
      const message = 'Nama bahan wajib diisi'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      const message = 'Nama bahan harus 2-80 karakter'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (!Number.isFinite(stokAktual) || stokAktual < 0) {
      const message = 'Stok tidak boleh negatif'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (!Number.isFinite(batasMinimum) || batasMinimum < 0) {
      const message = 'Batas minimum tidak boleh negatif'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (!form.id_cabang || form.id_cabang < 1) {
      const message = 'Cabang harus dipilih'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (!form.id_supplier || form.id_supplier < 1) {
      const message = 'Supplier harus dipilih'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    try {
      if (editing) {
        await api.updateBahan(editing.id_bahan, {
          ...form,
          nama_bahan: trimmedName,
          stok_aktual: stokAktual,
          batas_minimum: batasMinimum,
        })
        await showSuccess('Perubahan disimpan', 'Data bahan berhasil diperbarui.')
      } else {
        await api.createBahan({
          ...form,
          nama_bahan: trimmedName,
          stok_aktual: stokAktual,
          batas_minimum: batasMinimum,
        })
        await showSuccess('Data tersimpan', 'Bahan baru berhasil ditambahkan.')
      }
      setOpen(false)
      setForm(initialForm)
      await loadData()
    } catch (submitError) {
      const message = parseApiError(submitError)
      setError(message)
      await showError('Gagal menyimpan', message)
    }
  }

  // remove menghapus bahan berdasarkan id
  const remove = async (id: number) => {
    try {
      const confirmed = await confirmDanger('Hapus bahan?', 'Data yang dihapus tidak bisa dikembalikan.')
      if (!confirmed) return
      await api.deleteBahan(id)
      await loadData()
      await showSuccess('Data dihapus', 'Bahan berhasil dihapus.')
    } catch (deleteError) {
      const message = parseApiError(deleteError)
      setError(message)
      await showError('Gagal menghapus', message)
    }
  }

  // rowData menambahkan status label berdasarkan stok vs batas minimum
  const rowData = useMemo(() => {
    const cabangMap = new Map(cabang.map((item) => [item.id_cabang, item.nama_cabang]))
    return bahan.map((item) => ({
      ...item,
      cabangLabel: cabangMap.get(item.id_cabang) ?? `Cabang ${item.id_cabang}`,
      status: item.stok_aktual <= 0 ? 'Habis' : item.stok_aktual <= item.batas_minimum ? 'Menipis' : 'Aman',
    }))
  }, [bahan, cabang])

  const exportedCsv = useMemo(() => {
    const rows = [
      ['nama_bahan', 'stok_aktual', 'batas_minimum', 'cabang', 'status'],
      ...rowData.map((item) => [
        item.nama_bahan,
        String(item.stok_aktual),
        String(item.batas_minimum),
        item.cabangLabel,
        item.status,
      ]),
    ]

    return rows.map((row) => row.join(',')).join('\n')
  }, [rowData])

  const downloadCsv = () => {
    const blob = new Blob([exportedCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'laporan-stok.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    void showSuccess('Export berhasil', 'Laporan stok berhasil diunduh.')
  }

  const supplierOptions = useMemo(() => {
    const allowed = new Set(['Disediakan Klien', 'Disediakan Konveksi'])
    return supplier.filter((item) => allowed.has(item.nama_supplier))
  }, [supplier])

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Manajemen Stok</h1>
          <p>Dashboard / Manajemen Stok</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={downloadCsv}>
            <Download size={16} /> Export
          </button>
          <button className="primary-btn" type="button" onClick={openCreate}>
            <Plus size={16} />
            Tambah
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Data Bahan">
        <div className="table-scroll">
          <table className="stack-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Bahan</th>
                <th>Tersedia</th>
                <th>Batas Minimum</th>
                <th>Cabang</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rowData.map((item, index) => (
                <tr key={item.id_bahan}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Nama Bahan">{item.nama_bahan}</td>
                  <td data-label="Tersedia">{item.stok_aktual}</td>
                  <td data-label="Batas Minimum">{item.batas_minimum}</td>
                  <td data-label="Cabang">{item.cabangLabel}</td>
                  <td data-label="Status">
                    <StatusPill status={item.status} />
                  </td>
                  <td data-label="Aksi">
                    <div className="action-row">
                      <button type="button" className="outline-btn" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="outline-btn danger"
                       onClick={() => void remove(item.id_bahan)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} title={editing ? 'Edit Bahan' : 'Bahan Baru'} onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={(event) => void submit(event)}>
          <label htmlFor="nama_bahan">Nama Bahan</label>
          <input
            id="nama_bahan"
            value={form.nama_bahan}
            onChange={(event) => setForm((current) => ({ ...current, nama_bahan: event.target.value }))}
            required
          />

          <label htmlFor="stok_aktual">Tersedia</label>
          <input
            id="stok_aktual"
            type="number"
            min={0}
            value={form.stok_aktual}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stok_aktual: Number(event.target.value),
              }))
            }
            required
          />

          <label htmlFor="batas_minimum">Batas Minimum</label>
          <input
            id="batas_minimum"
            type="number"
            min={0}
            value={form.batas_minimum}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                batas_minimum: Number(event.target.value),
              }))
            }
            required
          />

          <label htmlFor="id_cabang">Cabang</label>
          <select
            id="id_cabang"
            value={form.id_cabang}
            onChange={(event) => setForm((current) => ({ ...current, id_cabang: Number(event.target.value) }))}
          >
            {cabang.map((item) => (
              <option key={item.id_cabang} value={item.id_cabang}>
                {item.nama_cabang}
              </option>
            ))}
          </select>

          <label htmlFor="id_supplier">Sumber Bahan</label>
          <select
            id="id_supplier"
            value={form.id_supplier}
            onChange={(event) => setForm((current) => ({ ...current, id_supplier: Number(event.target.value) }))}
          >
            {supplierOptions.map((item) => (
              <option key={item.id_supplier} value={item.id_supplier}>
                {item.nama_supplier}
              </option>
            ))}
          </select>

          <div className="row-end full">
            <button type="button" className="ghost-btn" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className="primary-btn">
              {editing ? 'Perbarui' : 'Tambah Stok'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
