import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrderFormPage } from './pages/OrderFormPage'
import { OrdersPage } from './pages/OrdersPage'
import { ReportsPage } from './pages/ReportsPage'
import { StockPage } from './pages/StockPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stok" element={<StockPage />} />
        <Route path="pesanan" element={<OrdersPage />} />
        <Route path="pesanan/new" element={<OrderFormPage />} />
        <Route path="pesanan/:id" element={<OrderDetailPage />} />
        <Route path="laporan" element={<ReportsPage />} />
        <Route path="riwayat" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
