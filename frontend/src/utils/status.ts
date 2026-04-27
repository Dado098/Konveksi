export const getStatusVariant = (status: string): 'success' | 'warning' | 'muted' | 'info' => {
  const normalized = status.toLowerCase()

  if (normalized.includes('selesai') || normalized.includes('aman')) return 'success'
  if (normalized.includes('proses') || normalized.includes('menipis')) return 'warning'
  if (normalized.includes('menunggu') || normalized.includes('habis')) return 'muted'

  return 'info'
}
