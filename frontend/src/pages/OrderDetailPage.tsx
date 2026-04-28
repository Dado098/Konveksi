import { Download } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import type { AlokasiProduksi, Pesanan } from '../types/api'
import { formatDate, formatNumber, toInputDateValue } from '../utils/format'

export const OrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // order dan alokasi menampung data pesanan serta alokasi terkait
  const [order, setOrder] = useState<Pesanan | null>(null)
  const [alokasi, setAlokasi] = useState<AlokasiProduksi[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orderId = Number(id)

  // fetchData memuat detail pesanan + alokasi untuk halaman ini
  const fetchData = useCallback(async () => {
    try {
      const [orders, allocation] = await Promise.all([api.getPesanan(), api.getAlokasi()])
      const selectedOrder = orders.find((item) => item.id_pesanan === orderId) ?? null
      setOrder(selectedOrder)
      setAlokasi(allocation.filter((item) => item.id_pesanan === orderId))
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [orderId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // deleteOrder menghapus pesanan lalu kembali ke daftar
  const deleteOrder = async () => {
    if (!order) return

    try {
      await api.deletePesanan(order.id_pesanan)
      navigate('/pesanan')
    } catch (deleteError) {
      setError(parseApiError(deleteError))
    }
  }

  // totalAlokasi menghitung total qty dari semua alokasi produksi
  const totalAlokasi = useMemo(() => {
    return alokasi.reduce((accumulator, item) => accumulator + item.qty_alokasi, 0)
  }, [alokasi])

  // exportDetail mengunduh CSV detail alokasi pesanan
  const exportDetail = () => {
    const rows = [
      ['id_alokasi', 'id_cabang', 'qty_alokasi', 'status_lokal'],
      ...alokasi.map((item) => [
        String(item.id_alokasi),
        String(item.id_cabang),
        String(item.qty_alokasi),
        item.status_lokal,
      ]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `detail-pesanan-${orderId}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // submitEdit mengirim perubahan data pesanan ke backend
  const submitEdit = async () => {
    if (!order) return

    try {
      await api.updatePesanan(order.id_pesanan, {
        nama_pesanan: order.nama_pesanan,
        total_qty: order.total_qty,
        status_global: order.status_global,
        tgl_deadline: new Date(order.tgl_deadline).toISOString(),
      })
      setEditing(false)
      await fetchData()
    } catch (updateError) {
      setError(parseApiError(updateError))
    }
  }

  if (!order) {
    return <div className="error-box">Data pesanan tidak ditemukan.</div>
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Detail Pesanan</h1>
          <p>Dashboard / Detail Pesanan</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={exportDetail}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="outline-btn danger" onClick={() => void deleteOrder()}>
            Hapus
          </button>
          {!editing ? (
            <button type="button" className="primary-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : (
            <button type="button" className="primary-btn" onClick={() => void submitEdit()}>
              Simpan
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="detail-grid">
        <Card title="Detail Pesanan">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID Alokasi</th>
                  <th>Cabang</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alokasi.map((item) => (
                  <tr key={item.id_alokasi}>
                    <td>#{item.id_alokasi}</td>
                    <td>{item.id_cabang}</td>
                    <td>{formatNumber(item.qty_alokasi)}</td>
                    <td>
                      <StatusPill status={item.status_lokal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Ringkasan Pesanan">
          <div className="summary-list">
            <div>
              <span>Nama Pemesan</span>
              {editing ? (
                <input
                  value={order.nama_pesanan}
                  onChange={(event) => setOrder((current) => (current ? { ...current, nama_pesanan: event.target.value } : null))}
                />
              ) : (
                <strong>{order.nama_pesanan}</strong>
              )}
            </div>
            <div>
              <span>Kode</span>
              <strong>K{order.id_pesanan.toString().padStart(4, '0')}</strong>
            </div>
            <div>
              <span>Deadline</span>
              {editing ? (
                <input
                  type="date"
                  value={toInputDateValue(order.tgl_deadline)}
                  onChange={(event) =>
                    setOrder((current) => (current ? { ...current, tgl_deadline: new Date(event.target.value).toISOString() } : null))
                  }
                />
              ) : (
                <strong>{formatDate(order.tgl_deadline)}</strong>
              )}
            </div>
            <div>
              <span>Jumlah</span>
              {editing ? (
                <input
                  type="number"
                  value={order.total_qty}
                  onChange={(event) =>
                    setOrder((current) => (current ? { ...current, total_qty: Number(event.target.value) } : null))
                  }
                />
              ) : (
                <strong>{formatNumber(order.total_qty)}</strong>
              )}
            </div>
            <div>
              <span>Total Alokasi</span>
              <strong>{formatNumber(totalAlokasi)}</strong>
            </div>
            <div>
              <span>Status</span>
              {editing ? (
                <select
                  value={order.status_global}
                  onChange={(event) =>
                    setOrder((current) => (current ? { ...current, status_global: event.target.value } : null))
                  }
                >
                  <option value="Menunggu">Menunggu</option>
                  <option value="Proses">Proses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              ) : (
                <StatusPill status={order.status_global} />
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
