import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Filter } from 'lucide-react'
import { api } from '../api/services'
import type { Pesanan } from '../types/api'
import { parseApiError } from '../api/client'
import { Card, StatusPill } from '../components/UI'
import { formatDate, formatNumber, toInputDateValue } from '../utils/format'

const statuses = ['Selesai', 'Proses', 'Menunggu']

export const ReportsPage = () => {
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openFilter, setOpenFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState('')

  const loadData = useCallback(async () => {
    try {
      const response = await api.getPesanan()
      setOrders(response)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const passStatus = statusFilter.length === 0 || statusFilter.includes(item.status_global)
      const passDate = !dateFilter || toInputDateValue(item.tgl_deadline) === dateFilter
      return passStatus && passDate
    })
  }, [orders, statusFilter, dateFilter])

  const exportCsv = () => {
    const rows = [
      ['kode', 'nama_pemesan', 'jumlah', 'tanggal', 'status'],
      ...filteredOrders.map((item) => [
        `K${item.id_pesanan.toString().padStart(4, '0')}`,
        item.nama_pesanan,
        String(item.total_qty),
        formatDate(item.tgl_deadline),
        item.status_global,
      ]),
    ]

    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'laporan-filtered.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Laporan</h1>
          <p>Dashboard / Laporan</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="ghost-btn" onClick={() => setOpenFilter((current) => !current)}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className={`reports-layout ${openFilter ? 'with-filter' : ''}`}>
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Pemesan</th>
                  <th>Jumlah</th>
                  <th>Tanggal</th>
                  <th>Bayar</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((item) => (
                  <tr key={item.id_pesanan}>
                    <td>K{item.id_pesanan.toString().padStart(4, '0')}</td>
                    <td>{item.nama_pesanan}</td>
                    <td>{formatNumber(item.total_qty)}</td>
                    <td>{formatDate(item.tgl_deadline)}</td>
                    <td>Rp{formatNumber(item.total_qty * 1000)}</td>
                    <td>
                      <StatusPill status={item.status_global} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {openFilter && (
          <aside className="card filter-panel">
            <h3>Filter</h3>

            <label htmlFor="tanggal">Tanggal</label>
            <input id="tanggal" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />

            <p>Status Order</p>
            <div className="check-grid">
              {statuses.map((status) => (
                <label key={status} className="check-item">
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(status)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setStatusFilter((current) => [...current, status])
                      } else {
                        setStatusFilter((current) => current.filter((item) => item !== status))
                      }
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>

            <div className="row-end full">
              <button type="button" className="ghost-btn" onClick={() => { setDateFilter(''); setStatusFilter([]) }}>
                Clear Filter
              </button>
              <button type="button" className="primary-btn" onClick={() => setOpenFilter(false)}>
                Apply Filter
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
