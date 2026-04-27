import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string } | undefined
    return payload?.error ?? error.message
  }
  return 'Terjadi kesalahan yang tidak diketahui.'
}
