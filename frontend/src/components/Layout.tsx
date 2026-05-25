import { Bell, BookText, Boxes, ClipboardList, Gauge, History, LogOut, Menu, PackageOpen, Search, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { confirmDanger, showSuccess } from '../utils/alerts'

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
  const normalizedRole = normalizeRole(user?.role)
  const visibleNav = normalizedRole === 'owner' ? navItems.owner : navItems.karyawan
  const roleLabel = normalizedRole === 'karyawan' ? 'karyawan' : user?.role

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
            <Bell size={18} />
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
