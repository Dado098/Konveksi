import type {
    AlokasiProduksi,
    BahanBaku,
    Cabang,
    DetailKebutuhanBahan,
    LogKerja,
    Pesanan,
    Supplier,
    User,
} from '../types/api'
import { apiClient } from './client'

// api adalah lapisan service untuk semua komunikasi HTTP ke backend Golang.
// Setiap fungsi merepresentasikan kontrak endpoint yang ada di `main.go` backend.
// Pendekatan ini menjaga komponen UI tetap bersih dari detail request.
export const api = {
  // CABANG
  getCabang: async () => {
    const { data } = await apiClient.get<Cabang[]>('/cabang')
    return data
  },
  createCabang: async (payload: Omit<Cabang, 'id_cabang'>) => {
    const { data } = await apiClient.post<Cabang>('/cabang', payload)
    return data
  },

  // BAHAN BAKU
  getBahan: async () => {
    const { data } = await apiClient.get<BahanBaku[]>('/bahan')
    return data
  },
  createBahan: async (payload: Omit<BahanBaku, 'id_bahan'>) => {
    const { data } = await apiClient.post<BahanBaku>('/bahan', payload)
    return data
  },
  updateBahan: async (id: number, payload: Omit<BahanBaku, 'id_bahan'>) => {
    const { data } = await apiClient.put<BahanBaku>(`/bahan/${id}`, payload)
    return data
  },
  deleteBahan: async (id: number) => {
    await apiClient.delete(`/bahan/${id}`)
  },

  // SUPPLIER
  getSupplier: async () => {
    const { data } = await apiClient.get<Supplier[]>('/supplier')
    return data
  },

  // PESANAN
  getPesanan: async () => {
    const { data } = await apiClient.get<Pesanan[]>('/pesanan')
    return data
  },
  createPesanan: async (payload: Omit<Pesanan, 'id_pesanan'>) => {
    const { data } = await apiClient.post<Pesanan>('/pesanan', payload)
    return data
  },
  updatePesanan: async (id: number, payload: Omit<Pesanan, 'id_pesanan'>) => {
    const { data } = await apiClient.put<Pesanan>(`/pesanan/${id}`, payload)
    return data
  },
  deletePesanan: async (id: number) => {
    await apiClient.delete(`/pesanan/${id}`)
  },

  // ALOKASI PRODUKSI
  getAlokasi: async () => {
    const { data } = await apiClient.get<AlokasiProduksi[]>('/alokasi')
    return data
  },

  // DETAIL KEBUTUHAN BAHAN
  getDetailBahan: async () => {
    const { data } = await apiClient.get<DetailKebutuhanBahan[]>('/detail_kebutuhan_bahan')
    return data
  },

  // USER (dipakai untuk autentikasi sederhana di frontend)
  getUser: async () => {
    const { data } = await apiClient.get<User[]>('/user')
    return data
  },

  // LOG AKTIVITAS
  getLog: async () => {
    const { data } = await apiClient.get<LogKerja[]>('/log')
    return data
  },
}
