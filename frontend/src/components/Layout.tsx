import { Bell, BookText, Boxes, ClipboardList, Gauge, History, LogOut, PackageOpen, Search } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/stok', label: 'Manajemen Stok', icon: Boxes },
  { to: '/pesanan', label: 'Pesanan', icon: PackageOpen },
  { to: '/laporan', label: 'Laporan', icon: BookText },
  { to: '/riwayat', label: 'Riwayat', icon: History },
]

export const Layout = () => {
  // user dan logout berasal dari AuthContext
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Sidebar utama: brand + menu navigasi */}
        <div className="brand">
          <div className="brand-logo">JR</div>
          <div className="brand-sub">KONVEKSI</div>
        </div>

        <nav className="side-nav">
          {/* Menu utama dashboard */}
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <button type="button" className="logout-link" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          {/* Topbar: search dummy, notifikasi, dan user info */}
          <div className="search-wrap">
            <Search size={16} />
            <input placeholder="Search" />
          </div>
          <div className="top-actions">
            <Bell size={18} />
            <div className="user-box">
              <div className="avatar">{user?.nama[0]?.toUpperCase() ?? 'U'}</div>
              <div>
                <strong>{user?.nama}</strong>
                <p>{user?.role}</p>
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
