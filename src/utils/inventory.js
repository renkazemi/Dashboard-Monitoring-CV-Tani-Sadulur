import { keTanggalLokal } from './tanggal'

export const BATAS_UMUR_DEFAULT = {
  peringatanBulan: 6,
  maksimalBulan: 10,
}

export const STATUS_UMUR = {
  aman: {
    label: 'Aman',
    keterangan: 'Umur batch masih di bawah batas peringatan.',
    tone: 'aman',
  },
  waspada: {
    label: 'Waspada',
    keterangan: 'Batch sudah melewati batas 6 bulan dan perlu diprioritaskan.',
    tone: 'waspada',
  },
  lewat: {
    label: 'Lewat batas',
    keterangan: 'Batch sudah melewati batas mutu 10 bulan.',
    tone: 'lewat',
  },
  habis: {
    label: 'Habis',
    keterangan: 'Sisa stok batch sudah nol; batch tetap disimpan untuk jejak produksi.',
    tone: 'habis',
  },
}

const MS_PER_HARI = 24 * 60 * 60 * 1000
const HARI_PER_BULAN = 30.4375

const awalHari = (value) => {
  const tanggal = keTanggalLokal(value)
  tanggal.setHours(0, 0, 0, 0)
  return tanggal
}

/** Selisih hari kalender antara tanggal produksi dan hari ini. */
export function hitungUmurHari(tanggalProduksi, hariIni = new Date()) {
  if (!tanggalProduksi) return 0
  const selisih = awalHari(hariIni).getTime() - awalHari(tanggalProduksi).getTime()
  return Math.max(0, Math.round(selisih / MS_PER_HARI))
}

export function hitungUmurBulan(tanggalProduksi, hariIni = new Date()) {
  return hitungUmurHari(tanggalProduksi, hariIni) / HARI_PER_BULAN
}

/**
 * Aturan status umur batch (K8):
 * aman jika umur < 6 bulan, waspada jika 6–10 bulan, lewat batas jika > 10 bulan.
 */
export function tentukanStatusUmur(umurBulan, batas = BATAS_UMUR_DEFAULT) {
  if (umurBulan > batas.maksimalBulan) return 'lewat'
  if (umurBulan >= batas.peringatanBulan) return 'waspada'
  return 'aman'
}

export function hitungSisaBatch(batch) {
  const tersedia =
    (batch.produksiKg || 0) + (batch.penyesuaianKg || 0) - (batch.terpakaiKg || 0)
  return Math.max(0, tersedia)
}
