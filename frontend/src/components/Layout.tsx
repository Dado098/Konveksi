import { Bell, BookText, Boxes, ClipboardList, Gauge, History, LogOut, Menu, PackageOpen, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { confirmDanger, showSuccess } from '../utils/alerts'

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

const navItems = {
  owner: [
    { to: '/dashboard', label: 'Dashboard', icon: Gauge },
    { to: '/stok', label: 'Manajemen Stok', icon: Boxes },
    { to: '/pesanan', label: 'Pesanan', icon: PackageOpen },
    { to: '/laporan', label: 'Laporan', icon: BookText },
    { to: '/riwayat', label: 'Riwayat', icon: History },
  ],
  karyawan: [
    { to: '/dashboard', label: 'Dashboard', icon: Gauge },
    { to: '/pesanan', label: 'Pesanan', icon: PackageOpen },
  ],
}

const normalizeRole = (role?: string) => (role === 'admin' ? 'karyawan' : role)

export const Layout = () => {
  // user dan logout berasal dari AuthContext
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<DssNotification[]>([])
  const [notifFilter, setNotifFilter] = useState<'all' | DssType>('all')
  const normalizedRole = normalizeRole(user?.role)
  const visibleNav = normalizedRole === 'owner' ? navItems.owner : navItems.karyawan
  const roleLabel = normalizedRole === 'karyawan' ? 'karyawan' : user?.role

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ notifications: DssNotification[] }>).detail
      if (detail?.notifications) {
        setNotifications(detail.notifications)
      }
    }

    window.addEventListener('dss:notify', handler)
    return () => window.removeEventListener('dss:notify', handler)
  }, [])

  const urgentCount = notifications.filter((item) => item.urgency === 'critical' || item.urgency === 'high').length
  const filteredNotifications = notifFilter === 'all'
    ? notifications
    : notifications.filter((item) => item.type === notifFilter)

  const handleLogout = async () => {
    const confirmed = await confirmDanger('Logout?', 'Anda akan keluar dari sistem.')
    if (!confirmed) return
    logout()
    await showSuccess('Logout berhasil')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Sidebar utama: brand + menu navigasi */}
        <div className="brand">
          <div className="brand-logo">JR</div>
          <div className="brand-sub">KONVEKSI</div>
        </div>

        <nav className="side-nav">
          {/* Menu utama dashboard */}
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <button type="button" className="logout-link" onClick={() => void handleLogout()}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <button
        type="button"
        className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`}
        aria-label="Tutup navigasi"
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="main-panel">
        <header className="topbar">
          {/* Topbar: search dummy, notifikasi, dan user info */}
          <button
            type="button"
            className="menu-toggle"
            aria-label={isSidebarOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="search-wrap">
            <Search size={16} />
            <input placeholder="Search" />
          </div>
          <div className="top-actions">
            <div className="notif-wrap">
              <button
                type="button"
                className="notif-btn"
                aria-label="Notifikasi DSS"
                onClick={() => setIsNotifOpen((prev) => !prev)}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className={`notif-badge ${urgentCount > 0 ? 'urgent' : ''}`}>
                    {notifications.length}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <div className="notif-popover" role="dialog" aria-label="Daftar notifikasi">
                  <div className="notif-header">
                    <strong>Notifikasi DSS</strong>
                    <div className="notif-header-actions">
                      {urgentCount > 0 && <span className="notif-urgent">{urgentCount} urgent</span>}
                      <button
                        type="button"
                        className="notif-close"
                        aria-label="Tutup notifikasi"
                        onClick={() => setIsNotifOpen(false)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="notif-filters">
                    <button
                      type="button"
                      className={`notif-filter ${notifFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setNotifFilter('all')}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      className={`notif-filter ${notifFilter === 'deadline' ? 'active' : ''}`}
                      onClick={() => setNotifFilter('deadline')}
                    >
                      Deadline
                    </button>
                    <button
                      type="button"
                      className={`notif-filter ${notifFilter === 'stock' ? 'active' : ''}`}
                      onClick={() => setNotifFilter('stock')}
                    >
                      Stok
                    </button>
                    <button
                      type="button"
                      className={`notif-filter ${notifFilter === 'priority' ? 'active' : ''}`}
                      onClick={() => setNotifFilter('priority')}
                    >
                      Prioritas
                    </button>
                  </div>
                  <div className="notif-list">
                    {filteredNotifications.length === 0 ? (
                      <p className="notif-empty">Belum ada notifikasi.</p>
                    ) : (
                      filteredNotifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`notif-item urgency-${item.urgency}`}
                          onClick={() => {
                            setIsNotifOpen(false)
                            if (item.href) navigate(item.href)
                          }}
                        >
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.message}</p>
                          </div>
                          <span className={`urgency-badge ${item.urgency}`}>{item.urgency}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="user-box" role="button" tabIndex={0} onClick={() => navigate('/profil')} onKeyDown={(event) => { if (event.key === 'Enter') navigate('/profil') }}>
              <div className="avatar">{user?.nama[0]?.toUpperCase() ?? 'U'}</div>
              <div>
                <strong>{user?.nama}</strong>
                <p>{roleLabel}</p>
              </div>
              <ClipboardList size={16} />
            </div>
          </div>
        </header>

        <main className="page-content">
          {/* Outlet menampilkan halaman sesuai route */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
