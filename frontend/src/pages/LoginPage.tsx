import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types/api'

const roles: Role[] = ['owner', 'admin', 'karyawan']

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [nama, setNama] = useState('')
  const [role, setRole] = useState<Role>('owner')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(nama.trim(), role)
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login gagal')
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
        <p>Autentikasi menggunakan data user dari endpoint backend `/api/user`.</p>

        <label htmlFor="nama">Nama</label>
        <input
          id="nama"
          value={nama}
          onChange={(event) => setNama(event.target.value)}
          placeholder="Masukkan nama user"
          required
        />

        <label htmlFor="role">Role</label>
        <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {error && <div className="error-box">{error}</div>}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
