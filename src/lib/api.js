import axios from 'axios'

export const TOKEN_KEY = 'mrbs_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let unauthorizedHandler = null
let connectionHandler = null

/**
 * Dipanggil dengan true/false setiap kali server berhasil/gagal dihubungi. Lebih andal daripada
 * navigator.onLine, yang tetap "online" saat WiFi tersambung tetapi internet tidak jalan.
 */
export function onConnectionChange(handler) {
  connectionHandler = handler
}

/** Dipanggil saat API membalas 401/403-nonaktif (token kedaluwarsa / dicabut). */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => {
    connectionHandler?.(true)
    return response
  },
  (error) => {
    if (error.response) connectionHandler?.(true)
    else if (error.code !== 'ERR_CANCELED') connectionHandler?.(false)

    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/auth/login')
    const deactivated = status === 403 && /dinonaktifkan/i.test(error.response?.data?.message ?? '')

    if (!isLogin && (status === 401 || deactivated) && unauthorizedHandler) {
      unauthorizedHandler(error)
    }
    return Promise.reject(error)
  },
)

/** Pesan error yang ramah untuk ditampilkan ke user. */
export function errorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (!error?.response) return 'Tidak dapat terhubung ke server.'
  const data = error.response.data
  if (error.response.status === 422 && data?.errors) {
    return Object.values(data.errors)[0]?.[0] ?? data.message
  }
  return data?.message || fallback
}

/** Ubah error validasi Laravel menjadi { field: 'pesan pertama' }. */
export function validationErrors(error) {
  const errors = error?.response?.status === 422 ? error.response.data?.errors ?? {} : {}
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0]]))
}

export default api
