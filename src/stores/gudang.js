import { reactive } from 'vue'
import { JENIS_BY_VALUE } from '../data/jenisTransaksi'
import { api } from '../utils/api'
import { BATAS_UMUR_DEFAULT, hitungSisaBatch } from '../utils/inventory'

/**
 * Satu sumber data untuk seluruh halaman, diisi dari backend lewat muatData().
 * Fungsi baca di bawah dipakai untuk pratinjau formulir; server tetap yang
 * memutuskan validasi, FIFO, dan stok saat transaksi disimpan.
 */
export const gudang = reactive({
  hariIni: new Date().toLocaleDateString('sv-SE'),
  produk: [],
  batch: [],
  transaksi: [],
  pengaturan: { ...BATAS_UMUR_DEFAULT },
  periodeMinggu: [],
})

const pad = (value) => String(value).padStart(2, '0')

const ddmm = (iso) => {
  const [, bulan, hari] = iso.split('-')
  return `${hari}${bulan}`
}

export function stokProduk(produkId) {
  return gudang.batch
    .filter((batch) => batch.produkId === produkId)
    .reduce((total, batch) => total + hitungSisaBatch(batch), 0)
}

/** Batch dengan sisa stok, diurutkan dari tanggal produksi paling lama. */
export function batchTersedia(produkId) {
  return gudang.batch
    .filter((batch) => batch.produkId === produkId && hitungSisaBatch(batch) > 0)
    .sort((a, b) => a.tanggalProduksi.localeCompare(b.tanggalProduksi))
}

export function batchProduk(produkId) {
  return gudang.batch
    .filter((batch) => batch.produkId === produkId)
    .sort((a, b) => a.tanggalProduksi.localeCompare(b.tanggalProduksi))
}

/**
 * Batch yang bisa menerima retur: berat yang pernah keluar dari batch itu
 * dikurangi retur sebelumnya. Server memeriksa ulang saat disimpan.
 */
export function batchBisaRetur(produkId) {
  const bisa = {}
  for (const item of gudang.transaksi) {
    if (item.produkId !== produkId || !['keluar', 'retur'].includes(item.jenis)) continue
    for (const alokasi of item.alokasi || []) {
      const tanda = item.jenis === 'keluar' ? 1 : -1
      bisa[alokasi.batchId] = (bisa[alokasi.batchId] || 0) + tanda * alokasi.beratKg
    }
  }
  return batchProduk(produkId)
    .filter((batch) => bisa[batch.id] > 0)
    .map((batch) => ({ batch, bisaKg: bisa[batch.id] }))
    .reverse()
}

/**
 * Rencana pengambilan stok secara FIFO tanpa mengubah data.
 * Dipakai untuk pratinjau di formulir sekaligus eksekusi saat disimpan.
 */
export function rencanaFifo(produkId, beratKg) {
  let sisa = Math.max(0, Number(beratKg) || 0)
  const alokasi = []

  for (const batch of batchTersedia(produkId)) {
    if (sisa <= 0) break
    const tersedia = hitungSisaBatch(batch)
    const ambilKg = Math.min(sisa, tersedia)
    alokasi.push({ batch, ambilKg })
    sisa -= ambilKg
  }

  return { alokasi, kekuranganKg: sisa }
}

export function nomorDokumenBerikut(jenis, tanggal = gudang.hariIni) {
  const info = JENIS_BY_VALUE[jenis]
  const urut = gudang.transaksi.filter((item) => item.jenis === jenis).length + 1
  return `${info.prefix}-${ddmm(tanggal)}-${pad(urut)}`
}

export function kodeBatch(produk, tanggalProduksi) {
  return `B-${produk.kode}-${ddmm(tanggalProduksi)}`
}

export function batchProduksi(produkId, tanggalProduksi) {
  return (
    gudang.batch.find(
      (item) =>
        item.produkId === produkId &&
        item.tanggalProduksi === tanggalProduksi,
    ) || null
  )
}

export function nomorDokumenDipakai(nomor, kecualiId = null) {
  const kunci = nomor.trim().toLowerCase()
  return gudang.transaksi.some(
    (item) =>
      item.id !== kecualiId && item.nomorDokumen.toLowerCase() === kunci,
  )
}

export function produkById(produkId) {
  return gudang.produk.find((item) => item.id === produkId) || null
}

/** Muat ulang seluruh data gudang dari server (dipanggil setelah masuk dan setiap perubahan). */
export async function muatData() {
  Object.assign(gudang, await api('/data'))
  return gudang
}

/** Simpan batas umur baru. Server memvalidasi batas peringatan < batas maksimal. */
export async function perbaruiPengaturan(nilai) {
  gudang.pengaturan = await api('/pengaturan', { method: 'PUT', body: nilai })
  return { ...gudang.pengaturan }
}

/** Perbarui harga satuan pada master produk dan harga per kg turunannya. */
export async function perbaruiHargaProduk(produkId, hargaSatuan) {
  const produk = await api(`/produk/${produkId}`, {
    method: 'PUT',
    body: { hargaSatuan },
  })
  Object.assign(produkById(produkId), produk)
  return produk
}

/** Kembalikan seluruh data ke kondisi contoh awal di server. */
export async function resetDataDemo() {
  Object.assign(gudang, await api('/reset', { method: 'POST' }))
  return gudang
}

/**
 * Simpan transaksi baru. Validasi, FIFO, dan perhitungan stok dijalankan
 * server dalam satu transaksi basis data; data lalu dimuat ulang.
 */
export async function simpanTransaksi(input) {
  const hasil = await api('/transaksi', { method: 'POST', body: input })
  await muatData()
  return hasil
}
