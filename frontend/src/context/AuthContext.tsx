import { createContext, useContext, useMemo, useState } from 'react'
import { api } from '../api/services'
import type { Role, User } from '../types/api'
import { parseApiError } from '../api/client'

interface AuthState {
  user: User | null
  login: (nama: string, role: Role) => Promise<void>
  logout: () => void
}

// STORAGE_KEY menyimpan sesi user sederhana di browser
// agar user tetap login setelah refresh halaman.
const STORAGE_KEY = 'jr-konveksi-user'
const AuthContext = createContext<AuthState | undefined>(undefined)

// readStoredUser membaca sesi login yang tersimpan di localStorage.
// Jika data invalid/corrupt, data lama akan dihapus agar aman.
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

// AuthProvider adalah pusat state autentikasi frontend.
// Mekanisme login saat ini melakukan lookup user ke endpoint `/api/user`
// berdasarkan kombinasi nama + role (sesuai implementasi backend saat ini).
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  const login = async (nama: string, role: Role): Promise<void> => {
    try {
      // Ambil seluruh user lalu cari yang cocok
      const users = await api.getUser()
      const match = users.find(
        (item) => item.nama.toLowerCase() === nama.toLowerCase() && item.role === role,
      )

      if (!match) {
        throw new Error('User tidak ditemukan. Pastikan nama dan role sesuai data backend.')
      }

      // Simpan sesi login ke localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
      setUser(match)
    } catch (error) {
      const fallbackError = error instanceof Error ? error.message : parseApiError(error)
      throw new Error(fallbackError)
    }
  }

  const logout = (): void => {
    // Hapus sesi lokal saat logout
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

// useAuth menyediakan akses state auth ke seluruh komponen.
export const useAuth = (): AuthState => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }

  return context
}
