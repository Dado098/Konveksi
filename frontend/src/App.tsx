import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrderFormPage } from './pages/OrderFormPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
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
        <Route
          path="stok"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route path="pesanan" element={<OrdersPage />} />
        <Route
          path="pesanan/new"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OrderFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="pesanan/:id" element={<OrderDetailPage />} />
        <Route
          path="laporan"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="riwayat"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="profil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
