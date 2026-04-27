import { createContext, useContext, useMemo, useState } from 'react'
import { api } from '../api/services'
import type { Role, User } from '../types/api'
import { parseApiError } from '../api/client'

interface AuthState {
  user: User | null
  login: (nama: string, role: Role) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'jr-konveksi-user'
const AuthContext = createContext<AuthState | undefined>(undefined)

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  const login = async (nama: string, role: Role): Promise<void> => {
    try {
      const users = await api.getUser()
      const match = users.find(
        (item) => item.nama.toLowerCase() === nama.toLowerCase() && item.role === role,
      )

      if (!match) {
        throw new Error('User tidak ditemukan. Pastikan nama dan role sesuai data backend.')
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
      setUser(match)
    } catch (error) {
      const fallbackError = error instanceof Error ? error.message : parseApiError(error)
      throw new Error(fallbackError)
    }
  }

  const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }

  return context
}
