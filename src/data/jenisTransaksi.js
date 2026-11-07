/**
 * Enam jenis transaksi gudang CV Tani Sadulur.
 * `prefix` dipakai untuk nomor dokumen, `alasan` menandai jenis yang
 * wajib menyertakan keterangan/alasan (K9).
 */
export const JENIS_TRANSAKSI = [
  {
    value: 'masuk',
    label: 'Bahan baku masuk',
    pendek: 'Masuk',
    ringkas: 'Dari pemasok',
    ikon: 'truck',
    prefix: 'BM',
    keterangan: 'Penerimaan bahan baku (kasar) dari pemasok, dicatat dalam kg.',
    alasan: false,
  },
  {
    value: 'produksi',
    label: 'Hasil produksi',
    pendek: 'Produksi',
    ringkas: 'Batch baru',
    ikon: 'factory',
    prefix: 'PRD',
    keterangan: 'Membuat batch tepung baru per produk dan tanggal produksi.',
    alasan: false,
  },
  {
    value: 'keluar',
    label: 'Barang keluar',
    pendek: 'Keluar',
    ringkas: 'Penjualan FIFO',
    ikon: 'arrow-up-right',
    prefix: 'KLR',
    keterangan: 'Penjualan tepung. Batch diambil otomatis dari yang tertua (FIFO).',
    alasan: false,
  },
  {
    value: 'retur',
    label: 'Retur',
    pendek: 'Retur',
    ringkas: 'Barang kembali',
    ikon: 'undo',
    prefix: 'RTR',
    keterangan: 'Barang kembali ke batch asalnya, jadi umurnya tetap dihitung dari tanggal produksi batch itu.',
    alasan: true,
  },
  {
    value: 'ditolak',
    label: 'Barang ditolak',
    pendek: 'Ditolak',
    ringkas: 'Ditarik dari stok',
    ikon: 'x-circle',
    prefix: 'TOL',
    keterangan: 'Barang ditarik dari stok karena ditolak atau rusak, memakai FIFO.',
    alasan: true,
  },
  {
    value: 'koreksi',
    label: 'Koreksi stok',
    pendek: 'Koreksi',
    ringkas: 'Stock opname',
    ikon: 'sliders',
    prefix: 'KOR',
    keterangan: 'Penyesuaian hasil stock opname, bisa menambah atau mengurangi stok.',
    alasan: true,
  },
]

export const JENIS_BY_VALUE = Object.fromEntries(
  JENIS_TRANSAKSI.map((item) => [item.value, item]),
)

/** Jenis yang memakai produk tepung dan jumlah kemasan. */
export const JENIS_BERKEMASAN = ['produksi', 'keluar', 'retur', 'ditolak', 'koreksi']

/** Jenis yang memotong stok tepung. */
export const JENIS_MENGURANGI = ['keluar', 'ditolak']
