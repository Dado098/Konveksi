import { useCallback, useEffect, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card } from '../components/UI'
import { useRealtime } from '../hooks/useRealtime'
import type { LogKerja } from '../types/api'
import { formatDate } from '../utils/format'

export const HistoryPage = () => {
  const [logs, setLogs] = useState<LogKerja[]>([])
  const [error, setError] = useState<string | null>(null)

  // loadData memuat log aktivitas dari backend
  const loadData = useCallback(async () => {
    try {
      const response = await api.getLog()
      setLogs(response)
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Polling berkala untuk update riwayat
  useRealtime(() => {
    void loadData()
  }, 10000)

  return (
    <section className="page-grid">
      <div className="page-title-wrap">
        <h1>Riwayat</h1>
        <p>Dashboard / Riwayat</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <Card title="Riwayat Edit">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>ID User</th>
                <th>ID Alokasi</th>
                <th>Aktivitas</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item, index) => (
                <tr key={item.id_log}>
                  <td>{index + 1}</td>
                  <td>{item.id_user}</td>
                  <td>{item.id_alokasi}</td>
                  <td>{item.tahapan}</td>
                  <td>{formatDate(item.waktu_update)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
