import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'owner' | 'karyawan'>
}

const normalizeRole = (role?: string) => (role === 'admin' ? 'karyawan' : role)

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const normalizedRole = normalizeRole(user.role)
  if (allowedRoles && !allowedRoles.includes(normalizedRole as 'owner' | 'karyawan')) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
