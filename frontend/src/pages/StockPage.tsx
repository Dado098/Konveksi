import { Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, Modal, StatusPill } from '../components/UI'
import type { BahanBaku, Cabang, Supplier } from '../types/api'

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
    void loadData()
  }, [loadData])

  // openCreate menyiapkan form kosong untuk tambah bahan
  const openCreate = () => {
    setEditing(null)
    setForm({
      ...initialForm,
      id_cabang: cabang[0]?.id_cabang ?? 1,
      id_supplier: supplier[0]?.id_supplier ?? 1,
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

    if (!form.nama_bahan.trim()) {
      setError('Nama bahan wajib diisi')
      return
    }

    if (form.stok_aktual < 0) {
      setError('Stok tidak boleh negatif')
      return
    }

    try {
      if (editing) {
        await api.updateBahan(editing.id_bahan, form)
      } else {
        await api.createBahan(form)
      }
      setOpen(false)
      setForm(initialForm)
      await loadData()
    } catch (submitError) {
      setError(parseApiError(submitError))
    }
  }

  // remove menghapus bahan berdasarkan id
  const remove = async (id: number) => {
    try {
      await api.deleteBahan(id)
      await loadData()
    } catch (deleteError) {
      setError(parseApiError(deleteError))
    }
  }

  // rowData menambahkan status label berdasarkan stok vs batas minimum
  const rowData = useMemo(() => {
    return bahan.map((item) => ({
      ...item,
      status: item.stok_aktual <= 0 ? 'Habis' : item.stok_aktual <= item.batas_minimum ? 'Menipis' : 'Aman',
    }))
  }, [bahan])

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Manajemen Stok</h1>
          <p>Dashboard / Manajemen Stok</p>
        </div>
        <button className="primary-btn" type="button" onClick={openCreate}>
          <Plus size={16} />
          Tambah
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Data Bahan">
        <div className="table-scroll">
          <table>
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
                  <td>{index + 1}</td>
                  <td>{item.nama_bahan}</td>
                  <td>{item.stok_aktual}</td>
                  <td>{item.batas_minimum}</td>
                  <td>{item.id_cabang}</td>
                  <td>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="outline-btn" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="outline-btn danger" onClick={() => void remove(item.id_bahan)}>
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

          <label htmlFor="id_supplier">Supplier</label>
          <select
            id="id_supplier"
            value={form.id_supplier}
            onChange={(event) => setForm((current) => ({ ...current, id_supplier: Number(event.target.value) }))}
          >
            {supplier.map((item) => (
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
