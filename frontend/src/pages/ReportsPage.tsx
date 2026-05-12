import { Download, Filter } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import type { AlokasiProduksi, BahanBaku, DetailKebutuhanBahan, Pesanan } from '../types/api'
import { showInfo, showSuccess } from '../utils/alerts'
import { formatDate, formatNumber, toInputDateValue } from '../utils/format'

const statuses = ['Selesai', 'Proses', 'Menunggu', 'Batal']

export const ReportsPage = () => {
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [alokasi, setAlokasi] = useState<AlokasiProduksi[]>([])
  const [detailBahan, setDetailBahan] = useState<DetailKebutuhanBahan[]>([])
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openFilter, setOpenFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState('')

  // loadData mengambil semua data pesanan untuk laporan
  const loadData = useCallback(async () => {
    try {
      const [response, alokasiData, detailData, bahanData] = await Promise.all([
        api.getPesanan(),
        api.getAlokasi(),
        api.getDetailBahan(),
        api.getBahan(),
      ])
      setOrders(response)
      setAlokasi(alokasiData)
      setDetailBahan(detailData)
      setBahan(bahanData)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])
  const bahanListByPesanan = useMemo(() => {
    const bahanMap = new Map(bahan.map((item) => [item.id_bahan, item.nama_bahan]))
    const alokasiToPesanan = new Map(alokasi.map((item) => [item.id_alokasi, item.id_pesanan]))
    const byPesanan = new Map<number, Set<string>>()

    detailBahan.forEach((item) => {
      const orderId = alokasiToPesanan.get(item.id_alokasi)
      if (!orderId) return
      const name = bahanMap.get(item.id_bahan) ?? `Bahan #${item.id_bahan}`
      if (!byPesanan.has(orderId)) byPesanan.set(orderId, new Set())
      byPesanan.get(orderId)?.add(name)
    })

    const result = new Map<number, string[]>()
    byPesanan.forEach((set, orderId) => {
      result.set(orderId, Array.from(set).sort((a, b) => a.localeCompare(b)))
    })
    return result
  }, [alokasi, bahan, detailBahan])

  const getBahanLabel = (orderId: number) => {
    const list = bahanListByPesanan.get(orderId) ?? []
    if (list.length === 0) return 'Belum ada'
    if (list.length <= 2) return list.join(', ')
    return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
  }

  const getBahanCsv = (orderId: number) => {
    const list = bahanListByPesanan.get(orderId) ?? []
    return list.length === 0 ? '-' : list.join('; ')
  }

  const getHargaFlat = (item: Pesanan) => item.harga_flat || item.total_harga || 0


  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  // filteredOrders menerapkan filter status dan tanggal di client
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const passStatus = statusFilter.length === 0 || statusFilter.includes(item.status_global)
      const passDate = !dateFilter || toInputDateValue(item.tgl_deadline) === dateFilter
      return passStatus && passDate
    })
  }, [orders, statusFilter, dateFilter])

  const hasFilters = statusFilter.length > 0 || Boolean(dateFilter)

  const clearFilters = (closePanel = false) => {
    setDateFilter('')
    setStatusFilter([])
    if (closePanel) setOpenFilter(false)
    void showInfo('Filter dibersihkan', 'Laporan kembali ke semua data.')
  }

  // exportExcel mengunduh laporan ke file Excel dengan kolom rapi.
  const exportExcel = async () => {
    const XLSX = await import('xlsx')

    const rows = filteredOrders.map((item) => ({
      Kode: `K${item.id_pesanan.toString().padStart(4, '0')}`,
      'Nama Pemesan': item.nama_pesanan,
      Bahan: getBahanCsv(item.id_pesanan),
      Jumlah: item.total_qty,
      'Harga Flat': getHargaFlat(item),
      Tanggal: formatDate(item.tgl_deadline),
      Bayar: item.bayar ?? 0,
      Status: item.status_global,
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 40 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pesanan')
    XLSX.writeFile(workbook, 'laporan-pesanan.xlsx')
    void showSuccess('Export berhasil', 'Laporan Excel berhasil diunduh.')
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Laporan</h1>
          <p>Dashboard / Laporan</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={() => void exportExcel()}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="ghost-btn" onClick={() => clearFilters(true)} disabled={!hasFilters}>
            Clear
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
                  <th>Bahan</th>
                  <th>Jumlah</th>
                  <th>Harga Flat</th>
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
                    <td>{getBahanLabel(item.id_pesanan)}</td>
                    <td>{formatNumber(item.total_qty)}</td>
                    <td>Rp{formatNumber(getHargaFlat(item))}</td>
                    <td>{formatDate(item.tgl_deadline)}</td>
                    <td>Rp{formatNumber(item.bayar ?? 0)}</td>
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
              <button type="button" className="ghost-btn" onClick={() => clearFilters(false)}>
                Clear Filter
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setOpenFilter(false)
                  void showInfo('Filter diterapkan', 'Laporan telah diperbarui sesuai filter.')
                }}
              >
                Apply Filter
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
