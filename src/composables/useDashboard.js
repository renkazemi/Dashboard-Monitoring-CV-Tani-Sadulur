import { computed } from 'vue'
import { gudang } from '../stores/gudang'
import {
  STATUS_UMUR,
  hitungSisaBatch,
  hitungUmurBulan,
  hitungUmurHari,
  tentukanStatusUmur,
} from '../utils/inventory'
import { keTanggalLokal } from '../utils/tanggal'
import { JENIS_BY_VALUE } from '../data/jenisTransaksi'
import {
  formatBulan,
  formatHari,
  formatKg,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggal,
  formatTanggalPendek,
  formatUmur,
} from '../utils/format'

const LABEL_JENIS = {
  masuk: 'Bahan baku masuk',
  produksi: 'Produksi',
  keluar: 'Barang keluar',
  retur: 'Retur',
  ditolak: 'Barang ditolak',
  koreksi: 'Koreksi stok',
}

const IKON_JENIS = {
  masuk: 'truck',
  produksi: 'factory',
  keluar: 'arrow-up-right',
  retur: 'undo',
  ditolak: 'x-circle',
  koreksi: 'sliders',
}

const geserHari = (iso, jumlah) => {
  const tanggal = new Date(`${iso}T00:00:00`)
  tanggal.setDate(tanggal.getDate() + jumlah)
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0')
  const hari = String(tanggal.getDate()).padStart(2, '0')
  return `${tanggal.getFullYear()}-${bulan}-${hari}`
}

const jumlahkan = (daftar, ambil) =>
  daftar.reduce((total, item) => total + (ambil(item) || 0), 0)

export function useDashboard(data = gudang) {
  const hariIni = keTanggalLokal(data.hariIni)
  hariIni.setHours(12, 0, 0, 0)
  const produkById = Object.fromEntries(
    data.produk.map((item) => [item.id, item]),
  )

  const batchAktif = computed(() =>
    data.batch
      .map((item) => {
        const infoProduk = produkById[item.produkId]
        const sisaKg = hitungSisaBatch(item)
        const umurHari = hitungUmurHari(item.tanggalProduksi, hariIni)
        const umurBulan = hitungUmurBulan(item.tanggalProduksi, hariIni)
        const status = tentukanStatusUmur(umurBulan, data.pengaturan)
        return {
          ...item,
          produk: infoProduk,
          sisaKg,
          umurHari,
          umurBulan,
          umurLabel: formatUmur(umurHari),
          status,
          statusInfo: STATUS_UMUR[status],
          persenSisa: item.produksiKg
            ? Math.min(100, (sisaKg / item.produksiKg) * 100)
            : 0,
        }
      })
      .filter((item) => item.sisaKg > 0)
      .sort((a, b) => a.tanggalProduksi.localeCompare(b.tanggalProduksi)),
  )

  const produk = computed(() => {
    const daftarTepung = data.produk.filter((item) => item.jenis === 'tepung')
    const totalStok = jumlahkan(batchAktif.value, (item) => item.sisaKg)
    return daftarTepung.map((item) => {
      const batchProduk = batchAktif.value.filter(
        (batch) => batch.produkId === item.id,
      )
      const sisaKg = jumlahkan(batchProduk, (batch) => batch.sisaKg)
      return {
        ...item,
        sisaKg,
        jumlahBatch: batchProduk.length,
        kemasanSisa: Math.floor(sisaKg / item.beratPerSatuan),
        nilaiStok: sisaKg * item.hargaPerKg,
        porsi: totalStok ? (sisaKg / totalStok) * 100 : 0,
      }
    })
  })

  const transaksi = computed(() =>
    data.transaksi
      .map((item) => ({
        ...item,
        produk: produkById[item.produkId],
        waktu: `${item.tanggal}T${item.jam}`,
      }))
      .sort(
        (a, b) =>
          b.waktu.localeCompare(a.waktu) ||
          (b.dibuat || 0) - (a.dibuat || 0),
      ),
  )

  const kunciBulan = data.hariIni.slice(0, 7)

  const transaksiBulanIni = computed(() =>
    transaksi.value.filter((item) => item.tanggal.startsWith(kunciBulan)),
  )

  const penjualanBulanIni = computed(() => {
    const daftar = transaksiBulanIni.value.filter(
      (item) => item.jenis === 'keluar',
    )
    return {
      nilai: jumlahkan(daftar, (item) => item.nilai),
      beratKg: jumlahkan(daftar, (item) => item.beratKg),
      jumlahNota: daftar.length,
    }
  })

  const bahanBakuBulanIni = computed(() => {
    const daftar = transaksiBulanIni.value.filter(
      (item) => item.jenis === 'masuk',
    )
    return {
      beratKg: jumlahkan(daftar, (item) => item.beratKg),
      jumlahNota: daftar.length,
      jumlahPemasok: new Set(daftar.map((item) => item.pihak)).size,
    }
  })

  const produksiBulanIni = computed(() => {
    const daftar = transaksiBulanIni.value.filter(
      (item) => item.jenis === 'produksi',
    )
    return {
      beratKg: jumlahkan(daftar, (item) => item.beratKg),
      jumlahNota: daftar.length,
      jumlahBatch: new Set(daftar.map((item) => item.batchKode)).size,
    }
  })

  const totalStokKg = computed(() =>
    jumlahkan(batchAktif.value, (item) => item.sisaKg),
  )

  const nilaiStok = computed(() =>
    jumlahkan(produk.value, (item) => item.nilaiStok),
  )

  const ringkasan = computed(() => {
    const perhatian = batchAktif.value.filter((item) => item.status !== 'aman')
    const waspada = perhatian.filter((item) => item.status === 'waspada')
    const lewat = perhatian.filter((item) => item.status === 'lewat')
    const totalKeluarPeriode = jumlahkan(
      transaksi.value.filter((item) => item.jenis === 'keluar'),
      (item) => item.beratKg,
    )
    // Enam minggu data contoh dipakai sebagai dasar rata-rata keluar harian.
    const rataKeluarHarian = totalKeluarPeriode / 42

    return {
      stokKg: totalStokKg.value,
      nilaiStok: nilaiStok.value,
      jumlahBatch: batchAktif.value.length,
      jumlahProduk: produk.value.length,
      hariKeluar: rataKeluarHarian
        ? Math.max(1, Math.round(totalStokKg.value / rataKeluarHarian))
        : 0,
      penjualan: penjualanBulanIni.value,
      bahanBaku: bahanBakuBulanIni.value,
      produksi: produksiBulanIni.value,
      perhatian: {
        total: perhatian.length,
        waspada: waspada.length,
        lewat: lewat.length,
        beratWaspada: jumlahkan(waspada, (item) => item.sisaKg),
        beratLewat: jumlahkan(lewat, (item) => item.sisaKg),
        batch: perhatian,
      },
      hitunganStatus: {
        aman: batchAktif.value.filter((item) => item.status === 'aman').length,
        waspada: waspada.length,
        lewat: lewat.length,
      },
    }
  })

  const mingguan = computed(() =>
    data.periodeMinggu.map((awal, index) => {
      const akhir = geserHari(awal, 6)
      const daftar = transaksi.value.filter(
        (item) => item.tanggal >= awal && item.tanggal <= akhir,
      )
      const tanggalAwal = new Date(`${awal}T12:00:00`)
      const tanggalAkhir = new Date(`${akhir}T12:00:00`)
      const bulanSama = awal.slice(0, 7) === akhir.slice(0, 7)
      return {
        awal,
        akhir,
        label: `${formatTanggalPendek(tanggalAwal)} – ${formatTanggalPendek(tanggalAkhir)}`,
        labelRentang: bulanSama
          ? `${tanggalAwal.getDate()}–${formatTanggalPendek(tanggalAkhir)}`
          : `${formatTanggalPendek(tanggalAwal)}–${formatTanggalPendek(
              tanggalAkhir,
            )}`,
        masukKg: jumlahkan(
          daftar.filter((item) => item.jenis === 'masuk'),
          (item) => item.beratKg,
        ),
        produksiKg: jumlahkan(
          daftar.filter((item) => item.jenis === 'produksi'),
          (item) => item.beratKg,
        ),
        keluarKg: jumlahkan(
          daftar.filter((item) => item.jenis === 'keluar'),
          (item) => item.beratKg,
        ),
        nilaiKeluar: jumlahkan(
          daftar.filter((item) => item.jenis === 'keluar'),
          (item) => item.nilai,
        ),
        berjalan: index === data.periodeMinggu.length - 1,
        perProduk: produk.value.map((p) => {
          const milik = daftar.filter((item) => item.produkId === p.id)
          const keluar = milik.filter((item) => item.jenis === 'keluar')
          const produksi = milik.filter((item) => item.jenis === 'produksi')
          return {
            kunci: p.id,
            label: p.kemasan,
            satuan: p.kemasan.toLowerCase().startsWith('dus') ? 'dus' : 'karung',
            produksiJumlah: jumlahkan(produksi, (item) => item.jumlah),
            produksiKg: jumlahkan(produksi, (item) => item.beratKg),
            keluarJumlah: jumlahkan(keluar, (item) => item.jumlah),
            keluarKg: jumlahkan(keluar, (item) => item.beratKg),
            nilaiKeluar: jumlahkan(keluar, (item) => item.nilai),
          }
        }),
      }
    }),
  )

  const totalArus = computed(() => ({
    masukKg: jumlahkan(mingguan.value, (item) => item.masukKg),
    produksiKg: jumlahkan(mingguan.value, (item) => item.produksiKg),
    keluarKg: jumlahkan(mingguan.value, (item) => item.keluarKg),
    nilaiKeluar: jumlahkan(mingguan.value, (item) => item.nilaiKeluar),
  }))

  // Komposisi untuk diagram donat: produksi enam minggu (periode grafik arus) dan penjualan bulan ini.
  const produksiPerProduk = computed(() => {
    const awal = data.periodeMinggu[0] || kunciBulan
    return produk.value.map((item) => {
      const daftar = transaksi.value.filter(
        (trx) =>
          trx.jenis === 'produksi' &&
          trx.produkId === item.id &&
          trx.tanggal >= awal,
      )
      return {
        kunci: item.id,
        label: item.kemasan,
        nilai: jumlahkan(daftar, (trx) => trx.beratKg),
        jumlahBatch: new Set(daftar.map((trx) => trx.batchKode)).size,
      }
    })
  })

  const penjualanPerProduk = computed(() =>
    produk.value.map((item) => {
      const daftar = transaksiBulanIni.value.filter(
        (trx) => trx.jenis === 'keluar' && trx.produkId === item.id,
      )
      return {
        kunci: item.id,
        label: item.kemasan,
        nilai: jumlahkan(daftar, (trx) => trx.nilai),
        beratKg: jumlahkan(daftar, (trx) => trx.beratKg),
      }
    }),
  )

  const aktivitas = computed(() =>
    transaksi.value.slice(0, 6).map((item) => {
      const negatif =
        ['keluar', 'ditolak'].includes(item.jenis) ||
        (item.jenis === 'koreksi' && item.arah === 'kurang') ||
        item.beratKg < 0
      const berat = Math.abs(item.beratKg)
      let judul = item.pihak
      if (item.jenis === 'produksi') {
        judul = `Produksi ${item.produk.kemasan.toLowerCase()}`
      } else if (item.jenis === 'retur') {
        judul = `Retur dari ${item.pihak}`
      } else if (item.jenis === 'ditolak') {
        judul = `Ditolak ${item.pihak}`
      } else if (item.jenis === 'koreksi') {
        judul = `Koreksi stok (${item.arah === 'kurang' ? 'kurang' : 'tambah'})`
      }

      return {
        ...item,
        judul,
        ikon: IKON_JENIS[item.jenis] || 'receipt',
        labelJenis: LABEL_JENIS[item.jenis] || item.jenis,
        labelBerat: `${negatif ? '−' : '+'}${formatKg(berat)}`,
        negatif,
        nilaiLabel: item.jenis === 'keluar' ? formatRupiah(item.nilai) : null,
        meta: item.produk?.kemasan,
        alasan: JENIS_BY_VALUE[item.jenis]?.alasan ? item.keterangan : null,
      }
    }),
  )

  const infoHalaman = computed(() => ({
    hariIni: formatHari(hariIni),
    bulan: formatBulan(hariIni),
    batas: data.pengaturan,
    stokTertinggi: Math.max(
      ...produk.value.map((item) => item.sisaKg),
      1,
    ),
    hariIniISO: data.hariIni,
  }))

  return {
    data,
    batchAktif,
    produk,
    transaksi,
    transaksiBulanIni,
    ringkasan,
    mingguan,
    totalArus,
    produksiPerProduk,
    penjualanPerProduk,
    aktivitas,
    infoHalaman,
    format: {
      kg: formatKg,
      rupiah: formatRupiah,
      rupiahRingkas: formatRupiahRingkas,
      tanggal: formatTanggal,
      tanggalPendek: formatTanggalPendek,
    },
    labelJenis: LABEL_JENIS,
  }
}
