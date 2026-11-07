/**
 * Ubah nilai tanggal menjadi Date lokal. String tanggal tanpa jam
 * (YYYY-MM-DD) dibaca sebagai tengah malam lokal agar tidak bergeser
 * satu hari di zona waktu tertentu.
 */
export function keTanggalLokal(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}
