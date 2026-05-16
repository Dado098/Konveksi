import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseApiError } from '../api/client'
import { api } from '../api/services'
import type { User } from '../types/api'
import { showInfo } from '../utils/alerts'
import { AuthContext } from './authContextBase'

// STORAGE_KEY menyimpan sesi user sederhana di browser
// agar user tetap login setelah refresh halaman.
const STORAGE_KEY = 'jr-konveksi-user'
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
// Mekanisme login memvalidasi nama + role + password ke endpoint `/api/auth/login`.
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const idleTimerRef = useRef<number | null>(null)
  const idleTimeoutMs = 10 * 60 * 1000

  const login = useCallback(async (nama: string, password: string): Promise<void> => {
    try {
      const loggedIn = await api.login({ nama, password })

      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn))
      setUser(loggedIn)
    } catch (error) {
      const fallbackError = error instanceof Error ? error.message : parseApiError(error)
      throw new Error(fallbackError, { cause: error })
    }
  }, [])

  const logout = useCallback((): void => {
    // Hapus sesi lokal saat logout
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current)
      }
      return
    }

    const resetTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current)
      }
      idleTimerRef.current = window.setTimeout(async () => {
        logout()
        await showInfo('Sesi berakhir', 'Anda logout otomatis karena tidak ada aktivitas.')
        window.location.href = '/login'
      }, idleTimeoutMs)
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]

    activityEvents.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer))
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current)
      }
    }
  }, [user, logout, idleTimeoutMs])

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
    }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

