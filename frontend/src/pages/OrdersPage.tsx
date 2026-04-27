import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/services'
import { parseApiError } from '../api/client'
import type { Pesanan } from '../types/api'
import { Card, StatusPill } from '../components/UI'
import { formatDate } from '../utils/format'

export const OrdersPage = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const result = await api.getPesanan()
      setOrders(result)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const removeOrder = async (id: number) => {
    try {
      await api.deletePesanan(id)
      await loadData()
    } catch (deleteError) {
      setError(parseApiError(deleteError))
    }
  }

  const exportedCsv = useMemo(() => {
    const rows = [
      ['id_pesanan', 'nama_pesanan', 'total_qty', 'tgl_deadline', 'status_global'],
      ...orders.map((item) => [
        String(item.id_pesanan),
        item.nama_pesanan,
        String(item.total_qty),
        item.tgl_deadline,
        item.status_global,
      ]),
    ]

    return rows.map((row) => row.join(',')).join('\n')
  }, [orders])

  const downloadCsv = () => {
    const blob = new Blob([exportedCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'laporan-pesanan.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Pesanan</h1>
          <p>Dashboard / Pesanan</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={downloadCsv}>
            <Download size={16} /> Export
          </button>
          <button className="primary-btn" type="button" onClick={() => navigate('/pesanan/new')}>
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Data Pesanan">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Pemesan</th>
                <th>Kode</th>
                <th>Jumlah</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((item, index) => (
                <tr key={item.id_pesanan}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/pesanan/${item.id_pesanan}`}>{item.nama_pesanan}</Link>
                  </td>
                  <td>K{item.id_pesanan.toString().padStart(4, '0')}</td>
                  <td>{item.total_qty}</td>
                  <td>{formatDate(item.tgl_deadline)}</td>
                  <td>
                    <StatusPill status={item.status_global} />
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => navigate(`/pesanan/${item.id_pesanan}`)}
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        className="outline-btn danger"
                        onClick={() => void removeOrder(item.id_pesanan)}
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
    </section>
  )
}
