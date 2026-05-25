import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card } from '../components/UI'
import { useRealtime } from '../hooks/useRealtime'
import type { AlokasiProduksi, Cabang, LogKerja, Pesanan, User } from '../types/api'
import { confirmDanger, showError, showInfo, showSuccess } from '../utils/alerts'
import { formatDate } from '../utils/format'

export const HistoryPage = () => {
  const [logs, setLogs] = useState<LogKerja[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [alokasi, setAlokasi] = useState<AlokasiProduksi[]>([])
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [cabang, setCabang] = useState<Cabang[]>([])
  const [error, setError] = useState<string | null>(null)

  // loadData memuat log aktivitas dari backend
  const loadData = useCallback(async () => {
    try {
      const [logData, userData, alokasiData, pesananData, cabangData] = await Promise.all([
        api.getLog(),
        api.getUser(),
        api.getAlokasi(),
        api.getPesanan(),
        api.getCabang(),
      ])
      setLogs(logData)
      setUsers(userData)
      setAlokasi(alokasiData)
      setPesanan(pesananData)
      setCabang(cabangData)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  const userMap = useMemo(() => new Map(users.map((item) => [item.id_user, item.nama])), [users])
  const cabangMap = useMemo(() => new Map(cabang.map((item) => [item.id_cabang, item.nama_cabang])), [cabang])
  const alokasiMap = useMemo(() => new Map(alokasi.map((item) => [item.id_alokasi, item])), [alokasi])
  const pesananMap = useMemo(() => new Map(pesanan.map((item) => [item.id_pesanan, item.nama_pesanan])), [pesanan])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  // Polling berkala untuk update riwayat
  useRealtime(() => {
    void loadData()
  }, 10000)

  const clearHistory = async () => {
    if (logs.length === 0) {
      await showInfo('Tidak ada riwayat', 'Tidak ada log aktivitas yang bisa dihapus.')
      return
    }

    try {
      const confirmed = await confirmDanger('Bersihkan riwayat?', 'Semua log aktivitas akan dihapus.')
      if (!confirmed) return
      await api.clearLog()
      await loadData()
      await showSuccess('Riwayat dibersihkan', 'Semua log aktivitas berhasil dihapus.')
    } catch (clearError) {
      const message = parseApiError(clearError)
      setError(message)
      await showError('Gagal membersihkan', message)
    }
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap row-between">
        <div>
          <h1>Riwayat</h1>
          <p>Dashboard / Riwayat</p>
        </div>
        <div className="row-end">
          <button type="button" className="ghost-btn" onClick={() => void clearHistory()}>
            Clear
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Riwayat Edit">
        <div className="table-scroll">
          <table className="stack-table">
            <thead>
              <tr>
                <th>No</th>
                <th>User</th>
                <th>Pesanan</th>
                <th>Cabang</th>
                <th>Aktivitas</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={6} data-label="Info">Belum ada aktivitas yang tercatat.</td>
                </tr>
              ) : (
                logs.map((item, index) => {
                  const userName = userMap.get(item.id_user) ?? `User #${item.id_user}`
                  const alokasiItem = item.id_alokasi ? alokasiMap.get(item.id_alokasi) : undefined
                  const pesananName = alokasiItem ? pesananMap.get(alokasiItem.id_pesanan) : undefined
                  const cabangName = alokasiItem
                    ? cabangMap.get(alokasiItem.id_cabang)
                    : item.id_cabang
                      ? cabangMap.get(item.id_cabang)
                      : undefined

                  return (
                    <tr key={item.id_log}>
                      <td data-label="No">{index + 1}</td>
                      <td data-label="User">{userName}</td>
                      <td data-label="Pesanan">{pesananName ?? '-'}</td>
                      <td data-label="Cabang">{cabangName ?? '-'}</td>
                      <td data-label="Aktivitas">{item.tahapan}</td>
                      <td data-label="Tanggal">{formatDate(item.waktu_update)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
