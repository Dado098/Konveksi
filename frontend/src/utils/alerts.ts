import Swal from 'sweetalert2'

export const showSuccess = async (title: string, text?: string) => {
  await Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 1800,
    showConfirmButton: false,
  })
}

export const showError = async (title: string, text?: string) => {
  await Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
  })
}

export const showInfo = async (title: string, text?: string) => {
  await Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'OK',
  })
}

export const confirmDanger = async (title: string, text?: string) => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Ya, lanjutkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
  })

  return result.isConfirmed
}
