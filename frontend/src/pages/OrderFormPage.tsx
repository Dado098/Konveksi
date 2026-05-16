import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { useAuth } from '../context/useAuth'
import type { BahanBaku, Cabang } from '../types/api'
import { showError, showSuccess } from '../utils/alerts'
import { formatNumber } from '../utils/format'

const statuses = ['Menunggu', 'Proses', 'Selesai', 'Batal']

export const OrderFormPage = () => {
  const navigate = useNavigate()
  // form menyimpan input pembuatan pesanan baru
  const [form, setForm] = useState({
    nama_pesanan: '',
    total_qty: 0,
    harga_flat: 0,
    tgl_deadline: '',
    status_global: 'Menunggu',
  })
  const [cabang, setCabang] = useState<Cabang[]>([])
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [alokasi, setAlokasi] = useState<Array<{ id_cabang: number; qty_alokasi: number }>>([])
  const [material, setMaterial] = useState<Array<{ id_bahan: number; qty_bahan_per_pcs: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const showValidationError = async (message: string) => {
    setError(message)
    await showError('Validasi gagal', message)
  }

  const loadCabang = useCallback(async () => {
    try {
      const [cabangData, bahanData] = await Promise.all([api.getCabang(), api.getBahan()])
      setCabang(cabangData)
      setBahan(bahanData)
      if (cabangData.length > 0 && alokasi.length === 0) {
        setAlokasi([{ id_cabang: cabangData[0].id_cabang, qty_alokasi: 0 }])
      }
      if (bahanData.length > 0 && material.length === 0) {
        setMaterial([{ id_bahan: bahanData[0].id_bahan, qty_bahan_per_pcs: 0 }])
      }
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [alokasi.length, material.length])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCabang()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadCabang])

  const totalAlokasi = useMemo(() => {
    return alokasi.reduce((sum, item) => sum + item.qty_alokasi, 0)
  }, [alokasi])

  const normalizeQty = (value: number) => Number.isFinite(value) ? Math.floor(value) : 0

  // submit melakukan validasi dasar dan mengirim data ke backend
  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = form.nama_pesanan.trim()
    const totalQty = normalizeQty(form.total_qty)
    const hargaFlat = Number.isFinite(form.harga_flat) ? form.harga_flat : 0

    if (!trimmedName) {
      await showValidationError('Nama pemesan wajib diisi')
      return
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      await showValidationError('Nama pemesan harus 2-80 karakter')
      return
    }

    if (totalQty <= 0) {
      await showValidationError('Total qty harus lebih dari 0')
      return
    }

    if (totalQty > 1000000) {
      await showValidationError('Total qty terlalu besar')
      return
    }

    if (hargaFlat <= 0) {
      await showValidationError('Harga flat harus lebih dari 0')
      return
    }

    if (hargaFlat > 1000000000) {
      await showValidationError('Harga flat terlalu besar')
      return
    }

    if (alokasi.length === 0) {
      await showValidationError('Alokasi cabang wajib diisi')
      return
    }

    const uniqueCabang = new Set(alokasi.map((item) => item.id_cabang))
    if (uniqueCabang.size !== alokasi.length) {
      await showValidationError('Cabang alokasi tidak boleh duplikat')
      return
    }

    if (alokasi.some((item) => !Number.isFinite(item.qty_alokasi) || item.qty_alokasi <= 0)) {
      await showValidationError('Qty alokasi harus lebih dari 0')
      return
    }

    if (totalAlokasi !== totalQty) {
      await showValidationError('Total alokasi harus sama dengan jumlah pesanan')
      return
    }

    if (material.length === 0) {
      await showValidationError('Minimal satu bahan wajib dipilih')
      return
    }

    const uniqueBahan = new Set(material.map((item) => item.id_bahan))
    if (uniqueBahan.size !== material.length) {
      await showValidationError('Bahan tidak boleh duplikat')
      return
    }

    if (material.some((item) => !Number.isFinite(item.qty_bahan_per_pcs) || item.qty_bahan_per_pcs <= 0)) {
      await showValidationError('Qty bahan per pcs harus lebih dari 0')
      return
    }

    if (material.some((item) => item.qty_bahan_per_pcs > 1000)) {
      await showValidationError('Qty bahan per pcs terlalu besar')
      return
    }

    if (!form.tgl_deadline) {
      await showValidationError('Deadline wajib diisi')
      return
    }

    const deadlineDate = new Date(form.tgl_deadline)
    if (Number.isNaN(deadlineDate.getTime())) {
      await showValidationError('Deadline tidak valid')
      return
    }

    try {
      const created = await api.createPesanan({
        nama_pesanan: trimmedName,
        total_qty: totalQty,
        harga_flat: hargaFlat,
        bayar: 0,
        tgl_deadline: deadlineDate.toISOString(),
        status_global: form.status_global,
      })

      const alokasiResults = await Promise.all(
        alokasi.map((item) =>
          api.createAlokasi({
            id_pesanan: created.id_pesanan,
            id_cabang: item.id_cabang,
            qty_alokasi: item.qty_alokasi,
            status_lokal: form.status_global,
          }),
        ),
      )

      await Promise.all(
        alokasiResults.flatMap((row) =>
          material.map((detail) =>
            api.createDetailBahan({
              id_alokasi: row.id_alokasi,
              id_bahan: detail.id_bahan,
              qty_bahan_per_pcs: detail.qty_bahan_per_pcs,
            }),
          ),
        ),
      )

      await showSuccess('Pesanan dibuat', 'Data pesanan dan alokasi berhasil disimpan.')
      if (user) {
        const firstAllocation = alokasiResults[0]
        await api.createLog({
          id_user: user.id_user,
          id_alokasi: firstAllocation?.id_alokasi ?? 0,
          id_cabang: firstAllocation?.id_cabang ?? 0,
          tahapan: `Tambah pesanan: ${form.nama_pesanan}`,
        })
      }
      navigate('/pesanan')
    } catch (submitError) {
      const message = parseApiError(submitError)
      setError(message)
      await showError('Gagal menyimpan', message)
    }
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Pesanan</h1>
          <p>Dashboard / Pesanan</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => navigate('/pesanan')}>
          Cancel
        </button>
      </div>

      <div className="order-form-layout">
        <form className="card form-grid" onSubmit={(event) => void submit(event)}>
          <h3>Tambah Pesanan</h3>
          <p className="subtitle">Please provide details of this product.</p>

          <label htmlFor="nama">Nama Pemesan</label>
          <input
            id="nama"
            value={form.nama_pesanan}
            onChange={(event) => setForm((current) => ({ ...current, nama_pesanan: event.target.value }))}
            placeholder="Type the customer's name"
            required
          />

          <label htmlFor="deadline">Deadline</label>
          <input
            id="deadline"
            type="date"
            value={form.tgl_deadline}
            onChange={(event) => setForm((current) => ({ ...current, tgl_deadline: event.target.value }))}
            required
          />

          <label htmlFor="qty">Jumlah</label>
          <input
            id="qty"
            type="number"
            min={1}
            value={form.total_qty}
            onChange={(event) => setForm((current) => ({ ...current, total_qty: Number(event.target.value) }))}
            required
          />

          <label htmlFor="harga">Harga Flat</label>
          <input
            id="harga"
            type="text"
            inputMode="numeric"
            value={formatNumber(form.harga_flat)}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '')
              const numeric = raw ? Number(raw) : 0
              setForm((current) => ({ ...current, harga_flat: numeric }))
            }}
            required
          />

          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={form.status_global}
            onChange={(event) => setForm((current) => ({ ...current, status_global: event.target.value }))}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="divider" />
          <h4>Kebutuhan Bahan</h4>
          <p className="subtitle">Pilih bahan untuk pesanan dan isi kebutuhan per pcs.</p>

          {material.map((item, index) => (
            <div key={`${item.id_bahan}-${index}`} className="allocation-row">
              <select
                value={item.id_bahan}
                onChange={(event) =>
                  setMaterial((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, id_bahan: Number(event.target.value) } : row,
                    ),
                  )
                }
              >
                {bahan.map((data) => (
                  <option key={data.id_bahan} value={data.id_bahan}>
                    {data.nama_bahan}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                step={1}
                value={item.qty_bahan_per_pcs}
                onChange={(event) =>
                  setMaterial((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, qty_bahan_per_pcs: Number(event.target.value) } : row,
                    ),
                  )
                }
                placeholder="Qty/Pcs"
              />
              <button
                type="button"
                className="outline-btn danger"
                onClick={() => setMaterial((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              >
                Hapus
              </button>
            </div>
          ))}

          <div className="row-between allocation-summary">
            <button
              type="button"
              className="outline-btn"
              onClick={() =>
                setMaterial((current) => [
                  ...current,
                  { id_bahan: bahan[0]?.id_bahan ?? 1, qty_bahan_per_pcs: 0 },
                ])
              }
            >
              Tambah Bahan
            </button>
            <strong>Total Bahan: {material.length}</strong>
          </div>

          <div className="divider" />
          <h4>Alokasi Cabang</h4>
          <p className="subtitle">Total alokasi harus sama dengan jumlah pesanan.</p>

          {alokasi.map((item, index) => (
            <div key={`${item.id_cabang}-${index}`} className="allocation-row">
              <select
                value={item.id_cabang}
                onChange={(event) =>
                  setAlokasi((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, id_cabang: Number(event.target.value) } : row,
                    ),
                  )
                }
              >
                {cabang.map((data) => (
                  <option key={data.id_cabang} value={data.id_cabang}>
                    {data.nama_cabang}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.qty_alokasi}
                onChange={(event) =>
                  setAlokasi((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, qty_alokasi: Number(event.target.value) } : row,
                    ),
                  )
                }
                placeholder="Qty"
              />
              <button
                type="button"
                className="outline-btn danger"
                onClick={() => setAlokasi((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              >
                Hapus
              </button>
            </div>
          ))}

          <div className="row-between allocation-summary">
            <button
              type="button"
              className="outline-btn"
              onClick={() =>
                setAlokasi((current) => [
                  ...current,
                  { id_cabang: cabang[0]?.id_cabang ?? 1, qty_alokasi: 0 },
                ])
              }
            >
              Tambah Cabang
            </button>
            <strong>Total Alokasi: {totalAlokasi}</strong>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="row-end full">
            <button type="button" className="ghost-btn" onClick={() => navigate('/pesanan')}>
              Batal
            </button>
            <button type="submit" className="primary-btn">
              Simpan Pesanan
            </button>
          </div>
        </form>

        <aside className="card helper-card">
          <h3>Create a New product</h3>
          <p>
            There are three different section on this page. Product details, Product variants and Product
            pack sizes.
          </p>
        </aside>
      </div>
    </section>
  )
}
