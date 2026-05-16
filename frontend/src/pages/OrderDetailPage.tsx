import { Download } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import { useAuth } from '../context/useAuth'
import type { AlokasiProduksi, BahanBaku, DetailKebutuhanBahan, Pesanan } from '../types/api'
import { confirmDanger, showError, showSuccess } from '../utils/alerts'
import { formatDate, formatNumber, toInputDateValue } from '../utils/format'

export const OrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const normalizeRole = (role?: string) => (role === 'admin' ? 'karyawan' : role)

  // order dan alokasi menampung data pesanan serta alokasi terkait
  const [order, setOrder] = useState<Pesanan | null>(null)
  const [alokasi, setAlokasi] = useState<AlokasiProduksi[]>([])
  const [detailBahan, setDetailBahan] = useState<DetailKebutuhanBahan[]>([])
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cabangNames, setCabangNames] = useState<Map<number, string>>(new Map())
  const [baseStatus, setBaseStatus] = useState('')
  const { user } = useAuth()
  const isKaryawan = normalizeRole(user?.role) === 'karyawan'

  const orderId = Number(id)

  // fetchData memuat detail pesanan + alokasi untuk halaman ini
  const fetchData = useCallback(async () => {
    try {
      const [orders, allocation, cabang, detail, bahanData] = await Promise.all([
        api.getPesanan(),
        api.getAlokasi(),
        api.getCabang(),
        api.getDetailBahan(),
        api.getBahan(),
      ])
      const selectedOrder = orders.find((item) => item.id_pesanan === orderId) ?? null
      const normalizedOrder = selectedOrder
        ? { ...selectedOrder, harga_flat: selectedOrder.harga_flat || selectedOrder.total_harga || 0 }
        : null
      setOrder(normalizedOrder)
      setBaseStatus(normalizedOrder?.status_global ?? '')
      const orderAllocations = allocation.filter((item) => item.id_pesanan === orderId)
      if (normalizedOrder) {
        const targetStatus = normalizedOrder.status_global
        const mismatched = orderAllocations.filter((item) => item.status_lokal !== targetStatus)
        if (mismatched.length > 0) {
          await Promise.all(
            mismatched.map((item) => api.updateAlokasi(item.id_alokasi, { ...item, status_lokal: targetStatus })),
          )
          setAlokasi(orderAllocations.map((item) => ({ ...item, status_lokal: targetStatus })))
        } else {
          setAlokasi(orderAllocations)
        }
      } else {
        setAlokasi(orderAllocations)
      }
      setDetailBahan(detail)
      setBahan(bahanData)
      setCabangNames(new Map(cabang.map((item) => [item.id_cabang, item.nama_cabang])))
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [orderId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchData])

  // deleteOrder menghapus pesanan lalu kembali ke daftar
  const deleteOrder = async () => {
    if (!order) return

    if (isKaryawan) {
      await showError('Akses ditolak', 'Karyawan tidak diizinkan menghapus pesanan.')
      return
    }

    try {
      const confirmed = await confirmDanger('Hapus pesanan?', 'Pesanan akan terhapus permanen.')
      if (!confirmed) return
      await api.deletePesanan(order.id_pesanan)
      if (alokasi.length > 0) {
        await Promise.all(alokasi.map((item) => api.deleteAlokasi(item.id_alokasi)))
      }
      await showSuccess('Pesanan dihapus', 'Data pesanan berhasil dihapus.')
      if (user) {
        const firstAllocation = alokasi[0]
        await api.createLog({
          id_user: user.id_user,
          id_alokasi: firstAllocation?.id_alokasi ?? 0,
          id_cabang: firstAllocation?.id_cabang ?? 0,
          tahapan: `Hapus pesanan: ${order.nama_pesanan}`,
        })
      }
      navigate('/pesanan')
    } catch (deleteError) {
      const message = parseApiError(deleteError)
      setError(message)
      await showError('Gagal menghapus', message)
    }
  }

  // totalAlokasi menghitung total qty dari semua alokasi produksi
  const totalAlokasi = useMemo(() => {
    return alokasi.reduce((accumulator, item) => accumulator + item.qty_alokasi, 0)
  }, [alokasi])

  const bahanMap = useMemo(() => new Map(bahan.map((item) => [item.id_bahan, item.nama_bahan])), [bahan])
  const detailRows = useMemo(() => {
    const alokasiIds = new Set(alokasi.map((item) => item.id_alokasi))
    return detailBahan.filter((item) => alokasiIds.has(item.id_alokasi))
  }, [detailBahan, alokasi])

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
    void showSuccess('Export berhasil', 'Detail pesanan berhasil diunduh.')
  }

  // submitEdit mengirim perubahan data pesanan ke backend
  const submitEdit = async () => {
    if (!order) return

    if (isKaryawan) {
      const normalizedBase = baseStatus.toLowerCase()
      const normalizedNext = order.status_global.toLowerCase()
      if (!(normalizedBase.includes('proses') && normalizedNext.includes('selesai'))) {
        const message = 'Karyawan hanya boleh mengubah status dari Proses menjadi Selesai.'
        setError(message)
        await showError('Akses ditolak', message)
        return
      }
    }

    const trimmedName = order.nama_pesanan.trim()
    const totalQty = Number.isFinite(order.total_qty) ? Math.floor(order.total_qty) : 0
    const bayarValue = Number.isFinite(order.bayar) ? order.bayar : 0
    const hargaFlatValue = Number.isFinite(order.harga_flat) ? order.harga_flat : 0
    const deadlineDate = new Date(order.tgl_deadline)

    if (!trimmedName) {
      const message = 'Nama pemesan wajib diisi'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      const message = 'Nama pemesan harus 2-80 karakter'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (totalQty <= 0) {
      const message = 'Jumlah harus lebih dari 0'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (hargaFlatValue <= 0) {
      const message = 'Harga flat harus lebih dari 0'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (bayarValue < 0) {
      const message = 'Bayar tidak boleh negatif'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    if (Number.isNaN(deadlineDate.getTime())) {
      const message = 'Deadline tidak valid'
      setError(message)
      await showError('Validasi gagal', message)
      return
    }

    try {
      await api.updatePesanan(order.id_pesanan, {
        nama_pesanan: trimmedName,
        total_qty: totalQty,
        harga_flat: hargaFlatValue,
        bayar: bayarValue,
        status_global: order.status_global,
        tgl_deadline: deadlineDate.toISOString(),
      })
      await Promise.all(
        alokasi.map((item) => api.updateAlokasi(item.id_alokasi, { ...item, status_lokal: order.status_global })),
      )
      setEditing(false)
      await fetchData()
      await showSuccess('Perubahan disimpan', 'Detail pesanan berhasil diperbarui.')
      if (user) {
        const firstAllocation = alokasi[0]
        await api.createLog({
          id_user: user.id_user,
          id_alokasi: firstAllocation?.id_alokasi ?? 0,
          id_cabang: firstAllocation?.id_cabang ?? 0,
          tahapan: `Update pesanan: ${order.nama_pesanan}`,
        })
      }
    } catch (updateError) {
      const message = parseApiError(updateError)
      setError(message)
      await showError('Gagal menyimpan', message)
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
          {!isKaryawan && (
            <button type="button" className="outline-btn danger" onClick={() => void deleteOrder()}>
              Hapus
            </button>
          )}
          {!editing ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                if (isKaryawan && !baseStatus.toLowerCase().includes('proses')) return
                if (isKaryawan) {
                  setOrder((current) => (current ? { ...current, status_global: 'Selesai' } : null))
                }
                setEditing(true)
              }}
              disabled={isKaryawan && !baseStatus.toLowerCase().includes('proses')}
            >
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
                {alokasi.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Belum ada alokasi untuk pesanan ini.</td>
                  </tr>
                ) : (
                  alokasi.map((item) => (
                    <tr key={item.id_alokasi}>
                      <td>#{item.id_alokasi}</td>
                      <td>{cabangNames.get(item.id_cabang) ?? `Cabang ${item.id_cabang}`}</td>
                      <td>{formatNumber(item.qty_alokasi)}</td>
                      <td>
                        <StatusPill status={item.status_lokal} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Kebutuhan Bahan">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bahan</th>
                  <th>Qty per Pcs</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Belum ada kebutuhan bahan untuk pesanan ini.</td>
                  </tr>
                ) : (
                  detailRows.map((item) => (
                    <tr key={item.id_detail}>
                      <td>{bahanMap.get(item.id_bahan) ?? `Bahan #${item.id_bahan}`}</td>
                      <td>{item.qty_bahan_per_pcs}</td>
                    </tr>
                  ))
                )}
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
                  disabled={isKaryawan}
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
                  disabled={isKaryawan}
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
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(order.total_qty)}
                  disabled={isKaryawan}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, '')
                    const numeric = raw ? Number(raw) : 0
                    setOrder((current) => (current ? { ...current, total_qty: numeric } : null))
                  }}
                />
              ) : (
                <strong>{formatNumber(order.total_qty)}</strong>
              )}
            </div>
            <div>
              <span>Harga Flat</span>
              {editing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(order.harga_flat ?? 0)}
                  disabled={isKaryawan}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, '')
                    const numeric = raw ? Number(raw) : 0
                    setOrder((current) => (current ? { ...current, harga_flat: numeric } : null))
                  }}
                />
              ) : (
                <strong>Rp{formatNumber(order.harga_flat ?? 0)}</strong>
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
                  disabled={isKaryawan}
                  onChange={(event) =>
                    setOrder((current) => {
                      if (!current) return null
                      const nextStatus = event.target.value
                      return {
                        ...current,
                        status_global: nextStatus,
                        bayar: nextStatus === 'Batal' ? 0 : current.bayar,
                      }
                    })
                  }
                >
                  {isKaryawan ? (
                    <option value="Selesai">Selesai</option>
                  ) : (
                    <>
                      <option value="Menunggu">Menunggu</option>
                      <option value="Proses">Proses</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Batal">Batal</option>
                    </>
                  )}
                </select>
              ) : (
                <StatusPill status={order.status_global} />
              )}
            </div>
            <div>
              <span>Bayar</span>
              {editing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(order.bayar ?? 0)}
                  disabled={isKaryawan}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, '')
                    const numeric = raw ? Number(raw) : 0
                    setOrder((current) => (current ? { ...current, bayar: numeric } : null))
                  }}
                />
              ) : (
                <strong>Rp{formatNumber(order.bayar ?? 0)}</strong>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
