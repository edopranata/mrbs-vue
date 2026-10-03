// Warna blok booking berdasarkan jenis rapat (dipakai jadwal, legenda, dan detail).
export const BOOKING_TYPES = {
  internal: {
    label: 'Internal',
    block: 'bg-lime-200 border-lime-500 text-lime-950 hover:bg-lime-300',
    swatch: 'bg-lime-300',
  },
  external: {
    label: 'Eksternal',
    block: 'bg-teal-200 border-teal-500 text-teal-950 hover:bg-teal-300',
    swatch: 'bg-teal-300',
  },
}

export const bookingType = (type) => BOOKING_TYPES[type] ?? BOOKING_TYPES.internal
