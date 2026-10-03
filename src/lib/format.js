// Helper tanggal & waktu. Semua tanggal diperlakukan sebagai waktu lokal kantor
// (backend mengirim "YYYY-MM-DDTHH:mm:ss" tanpa offset).

const pad = (n) => String(n).padStart(2, '0')

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayStr = () => toDateStr(new Date())

export function parseDate(str) {
  const [y, m, d] = str.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(str, days) {
  const d = parseDate(str)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function formatDate(str, options) {
  return parseDate(str).toLocaleDateString(
    'id-ID',
    options ?? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  )
}

export const formatDateShort = (str) =>
  formatDate(str, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const minutesToTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

export function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} menit`
  return m ? `${h} jam ${m} menit` : `${h} jam`
}

/** Daftar pilihan jam dengan interval tertentu, misal 07:00, 07:30, ... */
export function timeOptions(start, end, step = 30) {
  const options = []
  for (let t = timeToMinutes(start); t <= timeToMinutes(end); t += step) {
    options.push(minutesToTime(t))
  }
  return options
}

// ---- Kalender (minggu dimulai hari Minggu) ----

export const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** Hari Minggu pada minggu yang memuat tanggal tsb. */
export function startOfWeek(str) {
  return addDays(str, -parseDate(str).getDay())
}

export const monthStart = (str) => `${str.slice(0, 7)}-01`

export function addMonths(str, months) {
  const d = parseDate(monthStart(str))
  d.setMonth(d.getMonth() + months)
  return toDateStr(d)
}

/** 42 tanggal (6 minggu) untuk grid kalender bulan yang memuat tanggal tsb. */
export function calendarDays(str) {
  const first = startOfWeek(monthStart(str))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export const formatMonth = (str) => formatDate(str, { month: 'long', year: 'numeric' })
