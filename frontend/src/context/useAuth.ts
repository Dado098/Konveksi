import { useContext } from 'react'
import { AuthContext } from './authContextBase'
import type { AuthState } from './authTypes'

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }

  return context
}
