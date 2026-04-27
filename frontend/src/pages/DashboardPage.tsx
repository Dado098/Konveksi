import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Card, StatusPill } from '../components/UI'
import { api } from '../api/services'
import { parseApiError } from '../api/client'
import { useRealtime } from '../hooks/useRealtime'
import { formatNumber, formatDate } from '../utils/format'
import type { AlokasiProduksi, BahanBaku, Pesanan } from '../types/api'

interface DashboardState {
  pesanan: Pesanan[]
  bahan: BahanBaku[]
  alokasi: AlokasiProduksi[]
}

const statusColor: Record<string, string> = {
  selesai: '#2ad7a2',
  proses: '#ffa44c',
  menunggu: '#ced3db',
}

const piePalette = ['#5a52ea', '#ffa44c', '#d4d8e0']

export const DashboardPage = () => {
  const [data, setData] = useState<DashboardState>({ pesanan: [], bahan: [], alokasi: [] })
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [pesanan, bahan, alokasi] = await Promise.all([api.getPesanan(), api.getBahan(), api.getAlokasi()])
      setData({ pesanan, bahan, alokasi })
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useRealtime(() => {
    void fetchData()
  })

  const groupedStatus = useMemo(() => {
    const seed = { selesai: 0, proses: 0, menunggu: 0 }
    return data.pesanan.reduce((accumulator, item) => {
      const normalized = item.status_global.toLowerCase()
      if (normalized.includes('selesai')) accumulator.selesai += 1
      else if (normalized.includes('proses')) accumulator.proses += 1
      else accumulator.menunggu += 1
      return accumulator
    }, seed)
  }, [data.pesanan])

  const productionSeries = useMemo(() => {
    const grouped = new Map<number, number>()
    data.alokasi.forEach((item) => {
      grouped.set(item.id_cabang, (grouped.get(item.id_cabang) ?? 0) + item.qty_alokasi)
    })

    return Array.from(grouped.entries()).map(([idCabang, qty]) => ({
      label: `Cabang ${idCabang}`,
      qty,
    }))
  }, [data.alokasi])

  const lowStock = useMemo(() => {
    return data.bahan.filter((item) => item.stok_aktual <= item.batas_minimum).length
  }, [data.bahan])

  return (
    <section className="page-grid">
      <div className="page-title-wrap">
        <h1>Dashboard</h1>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="dashboard-grid">
        <Card title="Produksi Harian">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productionSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#5a52ea" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Monitoring Stok">
          <div className="pie-row">
            <div className="pie-item">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'normal', value: Math.max(data.bahan.length - lowStock, 0) },
                      { name: 'low', value: Math.max(lowStock, 1) },
                    ]}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill={piePalette[0]} />
                    <Cell fill="#e6e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <p><strong>{Math.round(((data.bahan.length - lowStock) / (data.bahan.length || 1)) * 100)}%</strong> Aman</p>
            </div>
            <div className="pie-item">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'low', value: lowStock || 1 },
                      { name: 'rest', value: Math.max(data.bahan.length - lowStock, 0) },
                    ]}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill={piePalette[1]} />
                    <Cell fill="#e6e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <p><strong>{Math.round((lowStock / (data.bahan.length || 1)) * 100)}%</strong> Menipis</p>
            </div>
          </div>
        </Card>

        <Card title="Total Status Pemesanan">
          <div className="status-bars">
            {Object.entries(groupedStatus).map(([label, total]) => (
              <div key={label}>
                <div className="status-row">
                  <span>{label}</span>
                  <strong>{total}</strong>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width: `${(total / Math.max(data.pesanan.length, 1)) * 100}%`,
                      background: statusColor[label] ?? '#7c6eea',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Daftar Pesanan Aktif">
          <div className="simple-table">
            <div className="thead">
              <span>Nama Pemesan</span>
              <span>Jumlah</span>
              <span>Deadline</span>
              <span>Status</span>
            </div>
            {data.pesanan.slice(0, 4).map((item) => (
              <div className="trow" key={item.id_pesanan}>
                <span>{item.nama_pesanan}</span>
                <span>{formatNumber(item.total_qty)}</span>
                <span>{formatDate(item.tgl_deadline)}</span>
                <StatusPill status={item.status_global} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
