import { Download, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import { useAuth } from '../context/useAuth'
import type { AlokasiProduksi, BahanBaku, DetailKebutuhanBahan, Pesanan } from '../types/api'
import { confirmDanger, showError, showSuccess } from '../utils/alerts'
import { formatDate } from '../utils/format'

export const OrdersPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const normalizeRole = (role?: string) => (role === 'admin' ? 'karyawan' : role)
  const isKaryawan = normalizeRole(user?.role) === 'karyawan'
  const [orders, setOrders] = useState<Pesanan[]>([])
  const [alokasi, setAlokasi] = useState<AlokasiProduksi[]>([])
  const [detailBahan, setDetailBahan] = useState<DetailKebutuhanBahan[]>([])
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showCanceled, setShowCanceled] = useState(false)

  // loadData mengambil daftar pesanan untuk tabel utama
  const loadData = useCallback(async () => {
    try {
      const [result, alokasiData, detailData, bahanData] = await Promise.all([
        api.getPesanan(),
        api.getAlokasi(),
        api.getDetailBahan(),
        api.getBahan(),
      ])
      setOrders(result)
      setAlokasi(alokasiData)
      setDetailBahan(detailData)
      setBahan(bahanData)
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

  // removeOrder menghapus pesanan lalu refresh daftar
  const removeOrder = async (id: number) => {
    if (isKaryawan) {
      await showError('Akses ditolak', 'Karyawan tidak diizinkan menghapus pesanan.')
      return
    }
    try {
      const confirmed = await confirmDanger('Hapus pesanan?', 'Pesanan akan terhapus permanen.')
      if (!confirmed) return
      await api.deletePesanan(id)
      const alokasiData = await api.getAlokasi()
      const orphanTargets = alokasiData.filter((item) => item.id_pesanan === id)
      if (orphanTargets.length > 0) {
        await Promise.all(orphanTargets.map((item) => api.deleteAlokasi(item.id_alokasi)))
      }
      await loadData()
      await showSuccess('Pesanan dihapus', 'Data pesanan berhasil dihapus.')
      if (user) {
        await api.createLog({
          id_user: user.id_user,
          id_alokasi: 0,
          id_cabang: 0,
          tahapan: `Hapus pesanan #${id}`,
        })
      }
    } catch (deleteError) {
      const message = parseApiError(deleteError)
      setError(message)
      await showError('Gagal menghapus', message)
    }
  }

  const visibleOrders = useMemo(() => {
    return showCanceled ? orders : orders.filter((item) => !item.status_global.toLowerCase().includes('batal'))
  }, [orders, showCanceled])

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

  // exportedCsv membangun string CSV dari data pesanan
  const exportedCsv = useMemo(() => {
    const rows = [
      ['id_pesanan', 'nama_pesanan', 'bahan', 'total_qty', 'tgl_deadline', 'status_global'],
      ...visibleOrders.map((item) => [
        String(item.id_pesanan),
        item.nama_pesanan,
        getBahanCsv(item.id_pesanan),
        String(item.total_qty),
        item.tgl_deadline,
        item.status_global,
      ]),
    ]

    return rows.map((row) => row.join(',')).join('\n')
  }, [visibleOrders, bahanListByPesanan])

  // downloadCsv memicu unduhan file CSV ke client
  const downloadCsv = () => {
    const blob = new Blob([exportedCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'laporan-pesanan.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    void showSuccess('Export berhasil', 'File CSV pesanan berhasil diunduh.')
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
          <button type="button" className="ghost-btn" onClick={() => setShowCanceled((current) => !current)}>
            {showCanceled ? 'Sembunyikan Batal' : 'Tampilkan Batal'}
          </button>
          {!isKaryawan && (
            <button className="primary-btn" type="button" onClick={() => navigate('/pesanan/new')}>
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Data Pesanan">
        <div className="table-scroll">
          <table className="stack-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Pemesan</th>
                <th>Kode</th>
                <th>Bahan</th>
                <th>Jumlah</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((item, index) => (
                <tr key={item.id_pesanan}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Nama Pemesan">
                    <Link to={`/pesanan/${item.id_pesanan}`}>{item.nama_pesanan}</Link>
                  </td>
                  <td data-label="Kode">K{item.id_pesanan.toString().padStart(4, '0')}</td>
                  <td data-label="Bahan">{getBahanLabel(item.id_pesanan)}</td>
                  <td data-label="Jumlah">{item.total_qty}</td>
                  <td data-label="Deadline">{formatDate(item.tgl_deadline)}</td>
                  <td data-label="Status">
                    <StatusPill status={item.status_global} />
                  </td>
                  <td data-label="Aksi">
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
                        disabled={isKaryawan}
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
