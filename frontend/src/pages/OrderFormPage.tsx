import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/services'
import { parseApiError } from '../api/client'

const statuses = ['Menunggu', 'Proses', 'Selesai']

export const OrderFormPage = () => {
  const navigate = useNavigate()
  // form menyimpan input pembuatan pesanan baru
  const [form, setForm] = useState({
    nama_pesanan: '',
    total_qty: 0,
    tgl_deadline: '',
    status_global: 'Menunggu',
  })
  const [error, setError] = useState<string | null>(null)

  // submit melakukan validasi dasar dan mengirim data ke backend
  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.nama_pesanan.trim()) {
      setError('Nama pemesan wajib diisi')
      return
    }

    if (form.total_qty <= 0) {
      setError('Total qty harus lebih dari 0')
      return
    }

    if (!form.tgl_deadline) {
      setError('Deadline wajib diisi')
      return
    }

    try {
      await api.createPesanan({
        nama_pesanan: form.nama_pesanan,
        total_qty: form.total_qty,
        tgl_deadline: new Date(form.tgl_deadline).toISOString(),
        status_global: form.status_global,
      })
      navigate('/pesanan')
    } catch (submitError) {
      setError(parseApiError(submitError))
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
