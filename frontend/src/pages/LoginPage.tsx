import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { showError, showSuccess } from '../utils/alerts'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [nama, setNama] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // onSubmit menangani proses login:
  // - validasi input dasar
  // - panggil `login` dari AuthContext
  // - redirect ke dashboard jika berhasil
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const trimmedName = nama.trim()
    if (!trimmedName) {
      const message = 'Nama wajib diisi.'
      setError(message)
      setLoading(false)
      await showError('Validasi gagal', message)
      return
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      const message = 'Nama harus 2-80 karakter.'
      setError(message)
      setLoading(false)
      await showError('Validasi gagal', message)
      return
    }

    if (!password) {
      const message = 'Password wajib diisi.'
      setError(message)
      setLoading(false)
      await showError('Validasi gagal', message)
      return
    }

    try {
      await login(trimmedName, password)
      await showSuccess('Login berhasil', 'Selamat datang di sistem.')
      navigate('/dashboard')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Login gagal'
      setError(message)
      await showError('Login gagal', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand auth-brand">
          <div className="brand-logo">JR</div>
          <div className="brand-sub">KONVEKSI</div>
        </div>

        <h1>Masuk ke Sistem</h1>
        <p>Autentikasi menggunakan nama dan password.</p>

        <label htmlFor="nama">Nama</label>
        <input
          id="nama"
          value={nama}
          onChange={(event) => setNama(event.target.value)}
          placeholder="Masukkan nama user"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password"
          required
        />

        {error && <div className="error-box">{error}</div>}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
