import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import { useRealtime } from '../hooks/useRealtime'
import type { AlokasiProduksi, BahanBaku, Cabang, Pesanan } from '../types/api'
import { formatDate, formatNumber } from '../utils/format'

interface DashboardState {
  pesanan: Pesanan[]
  bahan: BahanBaku[]
  alokasi: AlokasiProduksi[]
  cabang: Cabang[]
}

const statusColor: Record<string, string> = {
  selesai: '#2ad7a2',
  proses: '#ffa44c',
  menunggu: '#ced3db',
  batal: '#f1b0b5',
}

const piePalette = ['#5a52ea', '#ffa44c', '#d4d8e0']
const barPalette = ['#5a52ea', '#26a6ff', '#ffa44c', '#2ad7a2', '#f87171', '#a855f7']

export const DashboardPage = () => {
    const isCanceled = (status: string) => status.toLowerCase().includes('batal')
    const isCompleted = (status: string) => status.toLowerCase().includes('selesai')
  // data menampung hasil fetch API untuk ringkasan dashboard
  const [data, setData] = useState<DashboardState>({ pesanan: [], bahan: [], alokasi: [], cabang: [] })
  const [error, setError] = useState<string | null>(null)

  // fetchData memuat seluruh data yang diperlukan dashboard dalam satu request batch
  const fetchData = useCallback(async () => {
    try {
      const [pesanan, bahan, alokasi, cabang] = await Promise.all([
        api.getPesanan(),
        api.getBahan(),
        api.getAlokasi(),
        api.getCabang(),
      ])
      setData({ pesanan, bahan, alokasi, cabang })
      setError(null)
    } catch (fetchError) {
      setError(parseApiError(fetchError))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchData])

  // Polling ringan untuk update realtime (stok, produksi, status pesanan)
  useRealtime(() => {
    void fetchData()
  })

  // groupedStatus merangkum jumlah pesanan berdasarkan status global
  const groupedStatus = useMemo(() => {
    const seed = { selesai: 0, proses: 0, menunggu: 0, batal: 0 }
    return data.pesanan.reduce((accumulator, item) => {
      const normalized = item.status_global.toLowerCase()
      if (normalized.includes('selesai')) accumulator.selesai += 1
      else if (normalized.includes('proses')) accumulator.proses += 1
      else if (normalized.includes('batal')) accumulator.batal += 1
      else accumulator.menunggu += 1
      return accumulator
    }, seed)
  }, [data.pesanan])

  // productionSeries merangkum produksi per cabang untuk chart bar
  const productionSeries = useMemo(() => {
    const grouped = new Map<number, number>()
    data.alokasi.forEach((item) => {
      grouped.set(item.id_cabang, (grouped.get(item.id_cabang) ?? 0) + item.qty_alokasi)
    })

    const cabangMap = new Map(data.cabang.map((item) => [item.id_cabang, item.nama_cabang]))

    return Array.from(grouped.entries()).map(([idCabang, qty]) => ({
      label: cabangMap.get(idCabang) ?? `Cabang ${idCabang}`,
      qty,
    }))
  }, [data.alokasi, data.cabang])

  // Monitoring stok dihitung berdasarkan total kuantitas stok, bukan jumlah item bahan.
  const totalStockQty = useMemo(() => {
    return data.bahan.reduce((accumulator, item) => accumulator + Math.max(item.stok_aktual, 0), 0)
  }, [data.bahan])

  const lowStockQty = useMemo(() => {
    return data.bahan
      .filter((item) => item.stok_aktual <= item.batas_minimum)
      .reduce((accumulator, item) => accumulator + Math.max(item.stok_aktual, 0), 0)
  }, [data.bahan])

  const normalStockQty = Math.max(totalStockQty - lowStockQty, 0)
  const normalPieData = totalStockQty === 0 ? [{ name: 'empty', value: 1 }] : [
    { name: 'normal', value: normalStockQty },
    { name: 'low', value: lowStockQty },
  ]
  const lowPieData = totalStockQty === 0 ? [{ name: 'empty', value: 1 }] : [
    { name: 'low', value: lowStockQty },
    { name: 'rest', value: normalStockQty },
  ]

  const cabangMap = useMemo(() => new Map(data.cabang.map((item) => [item.id_cabang, item.nama_cabang])), [data.cabang])

  const lowStockItems = useMemo(() => {
    return data.bahan
      .filter((item) => item.stok_aktual <= item.batas_minimum)
      .map((item) => ({
        id: item.id_bahan,
        nama: item.nama_bahan,
        stok: item.stok_aktual,
        batas: item.batas_minimum,
        cabang: cabangMap.get(item.id_cabang) ?? `Cabang ${item.id_cabang}`,
      }))
  }, [data.bahan, cabangMap])

  const deadlineAlerts = useMemo(() => {
    const today = new Date()
    const limitDays = 7

    return data.pesanan
      .filter((item) => !isCompleted(item.status_global) && !isCanceled(item.status_global))
      .map((item) => {
        const deadline = new Date(item.tgl_deadline)
        const diffMs = deadline.getTime() - today.getTime()
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        return {
          ...item,
          daysLeft,
        }
      })
      .filter((item) => item.daysLeft >= 0 && item.daysLeft <= limitDays)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [data.pesanan])

  const priorityQueue = useMemo(() => {
    const today = new Date()

    return data.pesanan
      .filter((item) => !isCompleted(item.status_global) && !isCanceled(item.status_global))
      .map((item) => {
        const deadline = new Date(item.tgl_deadline)
        const daysLeft = Math.max(Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0)
        const urgencyScore = Math.max(30 - daysLeft, 0)
        const qtyScore = Math.min(item.total_qty / 10, 50)
        return {
          ...item,
          daysLeft,
          score: urgencyScore + qtyScore,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [data.pesanan])

  return (
    <section className="page-grid">
      <div className="page-title-wrap">
        <h1>Dashboard</h1>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="dashboard-grid">
        <Card title="Produksi per Cabang">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productionSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                  {productionSeries.map((entry, index) => (
                    <Cell key={`cell-${entry.label}`} fill={barPalette[index % barPalette.length]} />
                  ))}
                </Bar>
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
                    data={normalPieData}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    paddingAngle={0}
                    cornerRadius={0}
                  >
                    {totalStockQty === 0 ? (
                      <Cell fill="#e6e7eb" />
                    ) : (
                      <>
                        <Cell fill={piePalette[0]} />
                        <Cell fill="#e6e7eb" />
                      </>
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <p><strong>{Math.round((normalStockQty / (totalStockQty || 1)) * 100)}%</strong> Aman</p>
            </div>
            <div className="pie-item">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={lowPieData}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    paddingAngle={0}
                    cornerRadius={0}
                  >
                    {totalStockQty === 0 ? (
                      <Cell fill="#e6e7eb" />
                    ) : (
                      <>
                        <Cell fill={piePalette[1]} />
                        <Cell fill="#e6e7eb" />
                      </>
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <p><strong>{Math.round((lowStockQty / (totalStockQty || 1)) * 100)}%</strong> Menipis</p>
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
            {data.pesanan.filter((item) => !item.status_global.toLowerCase().includes('batal')).slice(0, 4).map((item) => (
              <div className="trow" key={item.id_pesanan}>
                <span>{item.nama_pesanan}</span>
                <span>{formatNumber(item.total_qty)}</span>
                <span>{formatDate(item.tgl_deadline)}</span>
                <StatusPill status={item.status_global} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Notifikasi Stok Minimum">
          <div className="simple-table">
            <div className="thead">
              <span>Bahan</span>
              <span>Cabang</span>
              <span>Stok</span>
              <span>Batas</span>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="trow">
                <span>Semua stok aman.</span>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div className="trow" key={item.id}>
                  <span>{item.nama}</span>
                  <span>{item.cabang}</span>
                  <span>{item.stok}</span>
                  <span>{item.batas}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Notifikasi Deadline">
          <div className="simple-table">
            <div className="thead">
              <span>Pesanan</span>
              <span>Deadline</span>
              <span>Sisa</span>
              <span>Status</span>
            </div>
            {deadlineAlerts.length === 0 ? (
              <div className="trow">
                <span>Tidak ada pesanan mendekati deadline.</span>
              </div>
            ) : (
              deadlineAlerts.map((item) => (
                <div className="trow" key={item.id_pesanan}>
                  <span>{item.nama_pesanan}</span>
                  <span>{formatDate(item.tgl_deadline)}</span>
                  <span>{item.daysLeft} hari</span>
                  <StatusPill status={item.status_global} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Antrian Prioritas Produksi">
          <div className="simple-table">
            <div className="thead">
              <span>Pesanan</span>
              <span>Qty</span>
              <span>Sisa</span>
              <span>Skor</span>
            </div>
            {priorityQueue.length === 0 ? (
              <div className="trow">
                <span>Belum ada antrian prioritas.</span>
              </div>
            ) : (
              priorityQueue.map((item) => (
                <div className="trow" key={item.id_pesanan}>
                  <span>{item.nama_pesanan}</span>
                  <span>{formatNumber(item.total_qty)}</span>
                  <span>{item.daysLeft} hari</span>
                  <span>{Math.round(item.score)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  )
}
