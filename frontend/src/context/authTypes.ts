import type { User } from '../types/api'

export interface AuthState {
  user: User | null
  login: (nama: string, password: string) => Promise<void>
  logout: () => void
}
