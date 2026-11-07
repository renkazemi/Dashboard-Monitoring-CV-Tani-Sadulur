import { keTanggalLokal } from './tanggal'

const LOCALE = 'id-ID'

const nf = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const nfDesimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const nfRingkas = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const nfSatu = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
})

export function formatAngka(value) {
  return nf.format(Number(value) || 0)
}

export function formatDesimal(value) {
  return nfDesimal.format(Number(value) || 0)
}

export function formatKg(value) {
  return `${formatAngka(value)}\u00A0kg`
}

export function formatRupiah(value) {
  return `Rp${nf.format(Math.round(Number(value) || 0))}`
}

/**
 * Memisahkan nilai rupiah besar menjadi angka dan satuan agar muat di kartu:
 * { nilai: 'Rp1,71', satuan: 'miliar' }.
 * Nilai penuh tetap bisa dilihat lewat atribut title.
 */
export function pecahRupiah(value) {
  const angka = Math.round(Number(value) || 0)
  if (angka >= 1_000_000_000) {
    return {
      nilai: `Rp${nfRingkas.format(angka / 1_000_000_000)}`,
      satuan: 'miliar',
    }
  }
  if (angka >= 1_000_000) {
    return { nilai: `Rp${formatDesimal(angka / 1_000_000)}`, satuan: 'juta' }
  }
  return { nilai: formatRupiah(angka), satuan: '' }
}

export function formatRupiahRingkas(value) {
  const { nilai, satuan } = pecahRupiah(value)
  return satuan ? `${nilai} ${satuan}` : nilai
}

const tanggalPendek = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
})
const tanggalLengkap = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const namaHari = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const namaBulan = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
})

const keTanggal = keTanggalLokal

export function formatTanggal(value) {
  if (!value) return '–'
  return tanggalLengkap.format(keTanggal(value))
}

export function formatTanggalPendek(value) {
  if (!value) return '–'
  return tanggalPendek.format(keTanggal(value))
}

export function formatHari(value) {
  if (!value) return '–'
  return namaHari.format(keTanggal(value))
}

export function formatBulan(value) {
  if (!value) return '–'
  return namaBulan.format(keTanggal(value))
}

export function formatUmur(hari) {
  if (hari < 30) return `${formatAngka(hari)} hari`
  return `${nfSatu.format(hari / 30.4375)} bln`
}

export function formatPersen(value) {
  return `${formatDesimal(value)}%`
}

export const JAM_SEKARANG = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date())
