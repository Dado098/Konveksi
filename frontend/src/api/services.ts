import { apiClient } from './client'
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

export const api = {
  getCabang: async () => {
    const { data } = await apiClient.get<Cabang[]>('/cabang')
    return data
  },
  createCabang: async (payload: Omit<Cabang, 'id_cabang'>) => {
    const { data } = await apiClient.post<Cabang>('/cabang', payload)
    return data
  },

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

  getSupplier: async () => {
    const { data } = await apiClient.get<Supplier[]>('/supplier')
    return data
  },

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

  getAlokasi: async () => {
    const { data } = await apiClient.get<AlokasiProduksi[]>('/alokasi')
    return data
  },

  getDetailBahan: async () => {
    const { data } = await apiClient.get<DetailKebutuhanBahan[]>('/detail_kebutuhan_bahan')
    return data
  },

  getUser: async () => {
    const { data } = await apiClient.get<User[]>('/user')
    return data
  },

  getLog: async () => {
    const { data } = await apiClient.get<LogKerja[]>('/log')
    return data
  },
}
