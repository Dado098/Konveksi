import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/services'
import { useAuth } from '../context/useAuth'
import { showError, showSuccess } from '../utils/alerts'

export const ProfilePage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!user) return

    const trimmedCurrent = currentPassword.trim()
    const trimmedNew = newPassword.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (!currentPassword || !newPassword || !confirmPassword) {
      await showError('Validasi gagal', 'Semua field password wajib diisi.')
      return
    }

    if (trimmedNew.length < 6 || trimmedNew.length > 64) {
      await showError('Validasi gagal', 'Password baru harus 6-64 karakter.')
      return
    }

    if (trimmedNew !== trimmedConfirm) {
      await showError('Validasi gagal', 'Konfirmasi password tidak cocok.')
      return
    }

    if (!trimmedCurrent) {
      await showError('Validasi gagal', 'Password lama wajib diisi.')
      return
    }

    if (trimmedNew === trimmedCurrent) {
      await showError('Validasi gagal', 'Password baru tidak boleh sama dengan password lama.')
      return
    }

    try {
      setLoading(true)
      await api.changePassword({
        id_user: user.id_user,
        current_password: trimmedCurrent,
        new_password: trimmedNew,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await showSuccess('Password diperbarui', 'Silakan login kembali menggunakan password baru.')
      logout()
      navigate('/login')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengganti password'
      await showError('Gagal mengganti password', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-grid">
      <div className="page-title-wrap">
        <div>
          <h1>Profil</h1>
          <p>Dashboard / Profil</p>
        </div>
      </div>

      <div className="card form-grid" style={{ maxWidth: 520 }}>
        <h3>Ubah Password</h3>
        <p className="subtitle">Gunakan password lama untuk memperbarui akun.</p>

        <label htmlFor="currentPassword">Password Lama</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Masukkan password lama"
        />

        <label htmlFor="newPassword">Password Baru</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Masukkan password baru"
        />

        <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Ulangi password baru"
        />

        <div className="row-end full">
          <button type="button" className="primary-btn" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </div>
    </section>
  )
}
