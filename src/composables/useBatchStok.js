import { computed } from 'vue'
import { gudang } from '../stores/gudang'
import {
  STATUS_UMUR,
  hitungSisaBatch,
  hitungUmurBulan,
  hitungUmurHari,
  tentukanStatusUmur,
} from '../utils/inventory'
import { formatUmur } from '../utils/format'
import { keTanggalLokal } from '../utils/tanggal'

const jumlahkan = (daftar, ambil) =>
  daftar.reduce((total, item) => total + (ambil(item) || 0), 0)

const statusAktif = ['aman', 'waspada', 'lewat']

export function useBatchStok(data = gudang) {
  const hariIni = keTanggalLokal(data.hariIni)
  hariIni.setHours(12, 0, 0, 0)

  const produkById = Object.fromEntries(
    data.produk.map((item) => [item.id, item]),
  )

  const batchLengkap = computed(() =>
    data.batch
      .map((item) => {
        const produk = produkById[item.produkId]
        const sisaKg = hitungSisaBatch(item)
        const produksiKg = item.produksiKg || 0
        const penyesuaianKg = item.penyesuaianKg || 0
        const totalMasukKg = produksiKg + penyesuaianKg
        const terpakaiKg = item.terpakaiKg || 0
        const umurHari = hitungUmurHari(item.tanggalProduksi, hariIni)
        const umurBulan = hitungUmurBulan(item.tanggalProduksi, hariIni)
        const statusUmur = tentukanStatusUmur(umurBulan, data.pengaturan)
        const habis = sisaKg <= 0

        return {
          ...item,
          produk,
          sisaKg,
          produksiKg,
          penyesuaianKg,
          totalMasukKg,
          terpakaiKg,
          umurHari,
          umurBulan,
          umurLabel: formatUmur(umurHari),
          statusUmur,
          statusTampil: habis ? 'habis' : statusUmur,
          habis,
          persenSisa: totalMasukKg
            ? Math.min(100, Math.max(0, (sisaKg / totalMasukKg) * 100))
            : 0,
          nilaiStok: sisaKg * (produk?.hargaPerKg || 0),
        }
      })
      .sort((a, b) => a.tanggalProduksi.localeCompare(b.tanggalProduksi)),
  )

  const produk = computed(() => {
    const daftarTepung = data.produk.filter((item) => item.jenis === 'tepung')
    const totalStok = jumlahkan(
      batchLengkap.value.filter((item) => !item.habis),
      (item) => item.sisaKg,
    )

    return daftarTepung.map((item) => {
      const semuaBatch = batchLengkap.value.filter(
        (batch) => batch.produkId === item.id,
      )
      const batchAktif = semuaBatch.filter((batch) => !batch.habis)
      const sisaKg = jumlahkan(batchAktif, (batch) => batch.sisaKg)
      const komposisi = statusAktif.map((status) => {
        const subset = batchAktif.filter(
          (batch) => batch.statusUmur === status,
        )
        const beratKg = jumlahkan(subset, (batch) => batch.sisaKg)
        return {
          status,
          label: STATUS_UMUR[status].label,
          jumlah: subset.length,
          beratKg,
          persen: sisaKg ? (beratKg / sisaKg) * 100 : 0,
        }
      })
      const perhatian = komposisi.filter((item) => item.status !== 'aman')

      return {
        ...item,
        batchTotal: semuaBatch.length,
        batchAktif: batchAktif.length,
        batchHabis: semuaBatch.length - batchAktif.length,
        sisaKg,
        nilaiStok: sisaKg * item.hargaPerKg,
        kemasanSisa: item.beratPerSatuan
          ? Math.floor(sisaKg / item.beratPerSatuan)
          : 0,
        porsi: totalStok ? (sisaKg / totalStok) * 100 : 0,
        komposisi,
        perhatian: {
          jumlah: jumlahkan(perhatian, (item) => item.jumlah),
          beratKg: jumlahkan(perhatian, (item) => item.beratKg),
        },
      }
    })
  })

  const ringkasan = computed(() => {
    const semua = batchLengkap.value
    const aktif = semua.filter((item) => !item.habis)
    const perhatian = aktif.filter((item) => item.statusUmur !== 'aman')
    const waspada = aktif.filter((item) => item.statusUmur === 'waspada')
    const lewat = aktif.filter((item) => item.statusUmur === 'lewat')

    return {
      totalBatch: semua.length,
      batchAktif: aktif.length,
      batchHabis: semua.length - aktif.length,
      stokKg: jumlahkan(aktif, (item) => item.sisaKg),
      nilaiStok: jumlahkan(aktif, (item) => item.nilaiStok),
      hitunganStatus: {
        semua: semua.length,
        aktif: aktif.length,
        aman: aktif.filter((item) => item.statusUmur === 'aman').length,
        waspada: waspada.length,
        lewat: lewat.length,
        habis: semua.length - aktif.length,
      },
      perhatian: {
        jumlah: perhatian.length,
        waspada: waspada.length,
        lewat: lewat.length,
        beratKg: jumlahkan(perhatian, (item) => item.sisaKg),
      },
    }
  })

  const infoHalaman = computed(() => ({
    hariIniISO: data.hariIni,
    hariIni: data.hariIni,
    batas: data.pengaturan,
  }))

  const labelMutasi = {
    keluar: 'Barang keluar',
    ditolak: 'Barang ditolak',
    retur: 'Retur masuk',
  }

  const ikonMutasi = {
    keluar: 'arrow-up-right',
    ditolak: 'x-circle',
    retur: 'undo',
    koreksi: 'sliders',
    produksi: 'factory',
  }

  const arahTransaksi = (transaksi) => {
    if (transaksi.jenis === 'retur') return 'masuk'
    if (transaksi.jenis === 'koreksi') {
      return transaksi.arah === 'tambah' || Number(transaksi.beratKg) > 0
        ? 'masuk'
        : 'keluar'
    }
    return 'keluar'
  }

  /**
   * Menyusun jejak mutasi batch dari produksi, alokasi transaksi, dan
   * penyesuaian. Data contoh lama tidak menyimpan alokasi per nota, jadi
   * selisihnya ditampilkan sebagai pemakaian gabungan agar saldo tetap cocok.
   */
  function riwayatBatch(batchId) {
    const batch = data.batch.find((item) => item.id === batchId)
    if (!batch) return { events: [], pemakaianGabunganKg: 0 }

    const pembuka = []
    const transaksiProduksi = data.transaksi.filter(
      (item) => item.jenis === 'produksi' && item.batchKode === batch.kode,
    )
    let produksiTercatat = 0

    transaksiProduksi.forEach((item) => {
      const beratKg = Math.abs(Number(item.beratKg) || 0)
      produksiTercatat += beratKg
      pembuka.push({
        key: `produksi-${item.id}`,
        tanggal: item.tanggal || batch.tanggalProduksi,
        jam: item.jam || '07:30',
        judul: 'Produksi batch',
        kode: item.nomorDokumen,
        pihak: item.pihak,
        keterangan: item.keterangan,
        arah: 'masuk',
        beratKg,
        ikon: ikonMutasi.produksi,
      })
    })

    const saldoAwalKg = Math.max(
      0,
      (batch.produksiKg || 0) - produksiTercatat,
    )
    if (saldoAwalKg > 0) {
      pembuka.push({
        key: 'saldo-awal',
        tanggal: batch.tanggalProduksi,
        jam: '',
        judul: produksiTercatat ? 'Produksi awal batch' : 'Saldo awal batch',
        kode: null,
        pihak: 'Data contoh',
        keterangan:
          'Pencatatan awal batch pada data contoh sebelum rincian transaksi tersedia.',
        arah: 'masuk',
        beratKg: saldoAwalKg,
        ikon: 'layers',
        agregat: true,
      })
    }

    const alokasi = []
    let alokasiMasuk = 0
    let alokasiKeluar = 0

    data.transaksi.forEach((transaksi) => {
      if (!Array.isArray(transaksi.alokasi)) return
      const beratKg = transaksi.alokasi
        .filter((item) => item.batchId === batchId)
        .reduce((total, item) => total + (Number(item.beratKg) || 0), 0)
      if (beratKg <= 0) return

      const arah = arahTransaksi(transaksi)
      if (arah === 'masuk') alokasiMasuk += beratKg
      else alokasiKeluar += beratKg

      alokasi.push({
        key: `alokasi-${transaksi.id}`,
        tanggal: transaksi.tanggal,
        jam: transaksi.jam || '',
        judul:
          transaksi.jenis === 'koreksi'
            ? transaksi.arah === 'tambah' ||
              Number(transaksi.beratKg) > 0
              ? 'Koreksi tambah'
              : 'Koreksi kurang'
            : labelMutasi[transaksi.jenis] || transaksi.jenis,
        kode: transaksi.nomorDokumen,
        pihak: transaksi.pihak,
        keterangan: transaksi.keterangan,
        arah,
        beratKg,
        ikon: ikonMutasi[transaksi.jenis] || 'receipt',
        jenis: transaksi.jenis,
      })
    })

    const pemakaianGabunganKg = Math.max(
      0,
      (batch.terpakaiKg || 0) - alokasiKeluar,
    )
    const tambahanGabunganKg = Math.max(
      0,
      (batch.penyesuaianKg || 0) - alokasiMasuk,
    )

    const agregat = []
    if (pemakaianGabunganKg > 0) {
      agregat.push({
        key: 'pemakaian-gabungan',
        tanggal: null,
        jam: '',
        judul: 'Pemakaian gabungan',
        kode: null,
        pihak: 'Data contoh',
        keterangan:
          'Data contoh tidak merinci nota untuk pemakaian batch ini. Transaksi baru akan tampil per nota.',
        arah: 'keluar',
        beratKg: pemakaianGabunganKg,
        ikon: 'info',
        agregat: true,
      })
    }
    if (tambahanGabunganKg > 0) {
      agregat.push({
        key: 'penyesuaian-gabungan',
        tanggal: null,
        jam: '',
        judul: 'Penyesuaian gabungan',
        kode: null,
        pihak: 'Data contoh',
        keterangan:
          'Penyesuaian stok pada data contoh yang tidak memiliki rincian transaksi.',
        arah: 'masuk',
        beratKg: tambahanGabunganKg,
        ikon: 'sliders',
        agregat: true,
      })
    }

    const urutWaktu = (a, b) =>
      `${a.tanggal || '9999-99-99'}T${a.jam || '99:99'}`.localeCompare(
        `${b.tanggal || '9999-99-99'}T${b.jam || '99:99'}`,
      )

    pembuka.sort(urutWaktu)
    alokasi.sort(urutWaktu)

    let saldoKg = 0
    const events = [...pembuka, ...agregat, ...alokasi].map((item) => {
      saldoKg += item.arah === 'masuk' ? item.beratKg : -item.beratKg
      return { ...item, saldoKg }
    })

    return {
      events,
      pemakaianGabunganKg,
      tambahanGabunganKg,
      produksiTercatat,
      saldoAwalKg,
    }
  }

  return {
    data,
    batchLengkap,
    produk,
    ringkasan,
    infoHalaman,
    riwayatBatch,
  }
}
