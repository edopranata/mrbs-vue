/** Jeda animasi bertahap (stagger) untuk elemen ke-i, dibatasi agar daftar panjang tidak lambat. */
export function stagger(i, step = 40, max = 400) {
  return { animationDelay: `${Math.min(i * step, max)}ms` }
}
