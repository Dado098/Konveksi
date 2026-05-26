import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import { Card, StatusPill } from '../components/UI'
import { useAuth } from '../context/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import type { AlokasiProduksi, BahanBaku, Cabang, Pesanan } from '../types/api'
import { showToast } from '../utils/alerts'
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

type DssUrgency = 'critical' | 'high' | 'medium' | 'low'
type DssType = 'deadline' | 'stock' | 'priority'

interface DssNotification {
  id: string
  title: string
  message: string
  urgency: DssUrgency
  type: DssType
  href?: string
}

const getDeadlineUrgency = (daysLeft: number): DssUrgency => {
  if (daysLeft <= 2) return 'critical'
  if (daysLeft <= 4) return 'high'
  if (daysLeft <= 6) return 'medium'
  return 'low'
}

const getStockUrgency = (stok: number, batas: number): DssUrgency => {
  if (stok <= 0) return 'critical'
  if (stok <= Math.ceil(batas * 0.5)) return 'high'
  if (stok <= batas) return 'medium'
  return 'low'
}

export const DashboardPage = () => {
  const { user } = useAuth()
  const normalizeRole = (role?: string) => (role === 'admin' ? 'karyawan' : role)
  const isKaryawan = normalizeRole(user?.role) === 'karyawan'
  const isCanceled = (status: string) => status.toLowerCase().includes('batal')
  const isCompleted = (status: string) => status.toLowerCase().includes('selesai')
  // data menampung hasil fetch API untuk ringkasan dashboard
  const [data, setData] = useState<DashboardState>({ pesanan: [], bahan: [], alokasi: [], cabang: [] })
  const [error, setError] = useState<string | null>(null)
  const lastToastKey = useRef('')

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
    data.alokasi
      .filter((item) => item.status_lokal.toLowerCase().includes('proses'))
      .forEach((item) => {
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

  const activeOrders = useMemo(() => {
    return data.pesanan.filter((item) => !isCompleted(item.status_global) && !isCanceled(item.status_global))
  }, [data.pesanan])

  const activeStatus = useMemo(() => {
    const seed = { proses: 0, menunggu: 0 }
    return activeOrders.reduce((accumulator, item) => {
      const normalized = item.status_global.toLowerCase()
      if (normalized.includes('proses')) accumulator.proses += 1
      else accumulator.menunggu += 1
      return accumulator
    }, seed)
  }, [activeOrders])

  const activeTotal = activeStatus.proses + activeStatus.menunggu
  const activePieData = activeTotal === 0 ? [{ name: 'empty', value: 1 }] : [
    { name: 'proses', value: activeStatus.proses },
    { name: 'menunggu', value: activeStatus.menunggu },
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
        urgency: getStockUrgency(item.stok_aktual, item.batas_minimum),
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
          urgency: getDeadlineUrgency(daysLeft),
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
          urgency: urgencyScore >= 24 ? 'high' : urgencyScore >= 14 ? 'medium' : 'low',
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [data.pesanan])

  const notifications = useMemo<DssNotification[]>(() => {
    const entries: DssNotification[] = []

    lowStockItems.slice(0, 3).forEach((item) => {
      entries.push({
        id: `stock-${item.id}`,
        title: 'Stok minimum',
        message: `${item.nama} (${item.cabang}) tersisa ${item.stok}`,
        urgency: item.urgency as DssUrgency,
        type: 'stock',
        href: '/stok',
      })
    })

    deadlineAlerts.slice(0, 3).forEach((item) => {
      entries.push({
        id: `deadline-${item.id_pesanan}`,
        title: 'Deadline dekat',
        message: `${item.nama_pesanan} jatuh tempo ${item.daysLeft} hari lagi`,
         urgency: item.urgency as DssUrgency,
        type: 'deadline',
        href: '/pesanan',
      })
    })

    priorityQueue.slice(0, 3).forEach((item) => {
      entries.push({
        id: `priority-${item.id_pesanan}`,
        title: 'Prioritas produksi',
        message: `${item.nama_pesanan} skor ${Math.round(item.score)}`,
         urgency: item.urgency as DssUrgency,
        type: 'priority',
        href: '/pesanan',
      })
    })

    return entries
  }, [deadlineAlerts, lowStockItems, priorityQueue])

  useEffect(() => {
    const urgent = notifications.filter((item) => item.urgency === 'critical' || item.urgency === 'high')
    const sessionKey = 'dss-toast-shown'
    if (urgent.length > 0 && !sessionStorage.getItem(sessionKey)) {
      lastToastKey.current = urgent.map((item) => item.id).join('|')
      sessionStorage.setItem(sessionKey, '1')
      void showToast('Peringatan DSS', `${urgent.length} notifikasi butuh perhatian`)
    }

    window.dispatchEvent(new CustomEvent('dss:notify', { detail: { notifications } }))
  }, [notifications])

  return (
    <section className="page-grid">
      <div className="page-title-wrap">
        <h1>Dashboard</h1>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="dashboard-grid">
        {!isKaryawan && (
          <Card title="Produksi per Cabang">
            {productionSeries.length === 0 ? (
              <p>Belum ada data produksi per cabang.</p>
            ) : (
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
            )}
          </Card>
        )}

        {isKaryawan ? (
          <Card
            title="Monitoring Pesanan Aktif"
            actions={<span className={`urgency-badge ${activeTotal > 0 ? 'medium' : 'low'}`}>{activeTotal > 0 ? 'aktif' : 'normal'}</span>}
          >
            <div className="pie-row">
              <div className="pie-item">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={activePieData}
                      dataKey="value"
                      innerRadius={44}
                      outerRadius={58}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      paddingAngle={0}
                      cornerRadius={0}
                    >
                      {activeTotal === 0 ? (
                        <Cell fill="#e6e7eb" />
                      ) : (
                        <>
                          <Cell fill={piePalette[0]} />
                          <Cell fill={piePalette[1]} />
                        </>
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <p><strong>{activeTotal}</strong> Pesanan Aktif</p>
              </div>
              <div className="pie-item">
                <div className="status-bars">
                  <div className="status-row">
                    <span>Proses</span>
                    <strong>{activeStatus.proses}</strong>
                  </div>
                  <div className="status-row">
                    <span>Menunggu</span>
                    <strong>{activeStatus.menunggu}</strong>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
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
        )}

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

        <Card
          title="Pesanan Menunggu & Proses"
          actions={
            <span className={`urgency-badge ${activeTotal > 3 ? 'high' : activeTotal > 0 ? 'medium' : 'low'}`}>{activeTotal} aktif</span>
          }
        >
          <div className="simple-table">
            <div className="thead">
              <span>Nama Pemesan</span>
              <span>Jumlah</span>
              <span>Deadline</span>
              <span>Status</span>
            </div>
            {activeOrders.slice(0, 4).map((item) => (
              <div className="trow" key={item.id_pesanan}>
                <span>{item.nama_pesanan}</span>
                <span>{formatNumber(item.total_qty)}</span>
                <span>{formatDate(item.tgl_deadline)}</span>
                <StatusPill status={item.status_global} />
              </div>
            ))}
          </div>
        </Card>

        {!isKaryawan && (
          <Card
            title="Notifikasi Stok Minimum"
            actions={<span className={`urgency-badge ${lowStockItems.length > 0 ? 'high' : 'low'}`}>{lowStockItems.length} item</span>}
          >
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
                    <span className={`urgency-badge ${item.urgency}`}>{item.urgency}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

          <Card
            title="Notifikasi Deadline"
            actions={<span className={`urgency-badge ${deadlineAlerts.length > 0 ? 'high' : 'low'}`}>{deadlineAlerts.length} alert</span>}
          >
          <div className="simple-table">
            <div className="thead">
              <span>Pesanan</span>
              <span>Deadline</span>
              <span>Sisa</span>
              <span>Status</span>
                <span>Urgensi</span>
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
                    <span className={`urgency-badge ${item.urgency}`}>{item.urgency}</span>
                </div>
              ))
            )}
          </div>
        </Card>

          <Card
            title="Antrian Prioritas Produksi"
            actions={<span className={`urgency-badge ${priorityQueue.length > 0 ? 'medium' : 'low'}`}>{priorityQueue.length} antre</span>}
          >
          <div className="simple-table">
            <div className="thead">
              <span>Pesanan</span>
              <span>Qty</span>
              <span>Sisa</span>
              <span>Skor</span>
                <span>Urgensi</span>
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
                    <span className={`urgency-badge ${item.urgency}`}>{item.urgency}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  )
}
