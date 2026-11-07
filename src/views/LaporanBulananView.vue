<script setup>
import { computed, ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import JenisBadge from '../components/transaksi/JenisBadge.vue'
import logoTs from '../assets/logo-ts.png'
import { JENIS_BY_VALUE } from '../data/jenisTransaksi'
import { gudang } from '../stores/gudang'
import {
  formatAngka,
  formatBulan,
  formatHari,
  formatKg,
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
} from '../utils/format'

const hariIniLabel = formatHari(gudang.hariIni)
const bulanAwal = gudang.hariIni.slice(0, 7)
const bulan = ref(bulanAwal)

const bulanTersedia = computed(() => {
  const daftar = new Set([
    gudang.hariIni.slice(0, 7),
    ...gudang.transaksi.map((item) => item.tanggal.slice(0, 7)),
  ])
  return [...daftar].sort().reverse()
})

const produkMap = computed(() =>
  Object.fromEntries(gudang.produk.map((item) => [item.id, item])),
)

const produkTepung = computed(() =>
  gudang.produk.filter((item) => item.jenis === 'tepung'),
)

const labelBulan = computed(() => formatBulan(`${bulan.value}-01`))

const akhirPeriode = computed(() => {
  const [tahun, nomorBulan] = bulan.value.split('-').map(Number)
  const tanggal = new Date(tahun, nomorBulan, 0, 12, 0, 0, 0)
  const hari = String(tanggal.getDate()).padStart(2, '0')
  const bln = String(tanggal.getMonth() + 1).padStart(2, '0')
  return `${tanggal.getFullYear()}-${bln}-${hari}`
})

const transaksiBulan = computed(() =>
  gudang.transaksi
    .filter((item) => item.tanggal.startsWith(bulan.value))
    .map((item) => ({
      ...item,
      produk: produkMap.value[item.produkId],
      info: JENIS_BY_VALUE[item.jenis],
      beratAbs: Math.abs(Number(item.beratKg) || 0),
      jumlahAbs: Math.abs(Number(item.jumlah) || 0),
      nilai: Number(item.nilai) || 0,
      waktu: `${item.tanggal}T${item.jam || '00:00'}`,
    }))
    .sort((a, b) => a.waktu.localeCompare(b.waktu)),
)

const ringkasan = computed(() => {
  const daftar = transaksiBulan.value
  const jumlah = (jenis, ambil = (item) => item.beratAbs) =>
    daftar
      .filter((item) => item.jenis === jenis)
      .reduce((total, item) => total + ambil(item), 0)

  const koreksiMasuk = daftar
    .filter(
      (item) =>
        item.jenis === 'koreksi' &&
        (item.arah === 'tambah' ||
          (item.arah !== 'kurang' && Number(item.beratKg) > 0)),
    )
    .reduce((total, item) => total + item.beratAbs, 0)
  const koreksiKeluar = daftar
    .filter(
      (item) =>
        item.jenis === 'koreksi' &&
        (item.arah === 'kurang' ||
          (item.arah !== 'tambah' && Number(item.beratKg) < 0)),
    )
    .reduce((total, item) => total + item.beratAbs, 0)

  return {
    jumlahNota: daftar.length,
    masukKg: jumlah('masuk'),
    produksiKg: jumlah('produksi'),
    keluarKg: jumlah('keluar'),
    nilaiKeluar: jumlah('keluar', (item) => item.nilai),
    returKg: jumlah('retur'),
    ditolakKg: jumlah('ditolak'),
    koreksiMasukKg: koreksiMasuk,
    koreksiKeluarKg: koreksiKeluar,
    koreksiNetKg: koreksiMasuk - koreksiKeluar,
    jumlahPemasok: new Set(
      daftar.filter((item) => item.jenis === 'masuk').map((item) => item.pihak),
    ).size,
    jumlahPembeli: new Set(
      daftar
        .filter((item) => item.jenis === 'keluar')
        .map((item) => item.pihak),
    ).size,
  }
})

const rekapProduk = computed(() =>
  produkTepung.value.map((produk) => {
    const daftar = transaksiBulan.value.filter(
      (item) => item.produkId === produk.id,
    )
    const hitung = (jenis) =>
      daftar
        .filter((item) => item.jenis === jenis)
        .reduce((total, item) => total + item.beratAbs, 0)
    const koreksi = daftar
      .filter((item) => item.jenis === 'koreksi')
      .reduce((total, item) => {
        const masuk =
          item.arah === 'tambah' ||
          (item.arah !== 'kurang' && Number(item.beratKg) > 0)
        return total + (masuk ? item.beratAbs : -item.beratAbs)
      }, 0)
    const nilaiKeluar = daftar
      .filter((item) => item.jenis === 'keluar')
      .reduce((total, item) => total + item.nilai, 0)

    return {
      ...produk,
      produksiKg: hitung('produksi'),
      keluarKg: hitung('keluar'),
      returKg: hitung('retur'),
      ditolakKg: hitung('ditolak'),
      koreksiNetKg: koreksi,
      nilaiKeluar,
      jumlahNota: daftar.length,
    }
  }),
)

const totalProduk = computed(() =>
  rekapProduk.value.reduce(
    (total, item) => ({
      produksiKg: total.produksiKg + item.produksiKg,
      keluarKg: total.keluarKg + item.keluarKg,
      returKg: total.returKg + item.returKg,
      ditolakKg: total.ditolakKg + item.ditolakKg,
      koreksiNetKg: total.koreksiNetKg + item.koreksiNetKg,
      nilaiKeluar: total.nilaiKeluar + item.nilaiKeluar,
      jumlahNota: total.jumlahNota + item.jumlahNota,
    }),
    {
      produksiKg: 0,
      keluarKg: 0,
      returKg: 0,
      ditolakKg: 0,
      koreksiNetKg: 0,
      nilaiKeluar: 0,
      jumlahNota: 0,
    },
  ),
)

const arusBersih = computed(
  () =>
    ringkasan.value.produksiKg +
    ringkasan.value.returKg +
    ringkasan.value.koreksiNetKg -
    ringkasan.value.keluarKg -
    ringkasan.value.ditolakKg,
)

const labelKoreksi = (nilai) => {
  if (!nilai) return '—'
  return `${nilai > 0 ? '+' : '−'}${formatKg(Math.abs(nilai))}`
}

const tandaMasuk = (nilai) => (nilai ? `+${formatKg(nilai)}` : '0 kg')
const tandaKeluar = (nilai) => (nilai ? `−${formatKg(nilai)}` : '0 kg')

const satuanProduk = (item) => {
  const kemasan = item.produk?.kemasan?.toLowerCase() || ''
  if (kemasan.startsWith('dus')) return 'dus'
  if (kemasan.startsWith('karung')) return 'karung'
  return 'kg'
}

const jumlahTabel = (item) => {
  if (item.jenis === 'masuk' || !item.produk) return '—'
  const negatif =
    item.jenis === 'koreksi' &&
    (item.arah === 'kurang' ||
      (item.arah !== 'tambah' && Number(item.beratKg) < 0))
  return `${negatif ? '−' : ''}${formatAngka(item.jumlahAbs)} ${satuanProduk(item)}`
}

const beratTabel = (item) => {
  const negatif =
    ['keluar', 'ditolak'].includes(item.jenis) ||
    (item.jenis === 'koreksi' &&
      (item.arah === 'kurang' ||
        (item.arah !== 'tambah' && Number(item.beratKg) < 0)))
  return `${negatif ? '−' : ''}${formatKg(item.beratAbs)}`
}

function cetak() {
  window.print()
}
</script>

<template>
  <div class="laporan-page">
    <AppTopbar :tanggal="hariIniLabel" halaman="Laporan bulanan" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head no-print">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Laporan bulanan</h1>
          <p class="page-sub">
            Rekap arus barang dan transaksi tepung untuk periode terpilih.
          </p>
        </div>

        <div class="page-head__actions">
          <label class="month-control" for="bulan-laporan">
            <IconApp nama="calendar" :ukuran="14" />
            <span class="sr-only">Pilih bulan laporan</span>
            <select id="bulan-laporan" v-model="bulan">
              <option v-for="item in bulanTersedia" :key="item" :value="item">
                {{ formatBulan(`${item}-01`) }}
              </option>
            </select>
          </label>
          <button type="button" class="print-btn" @click="cetak">
            <IconApp nama="file-text" :ukuran="14" />
            Cetak / simpan PDF
          </button>
        </div>
      </header>

      <article class="report-sheet" aria-labelledby="laporan-judul">
        <header class="report-head">
          <div class="report-brand">
            <img class="report-mark" :src="logoTs" alt="Logo CV Tani Sadulur" />
            <div>
              <strong>CV Tani Sadulur</strong>
              <span>Gudang Bogor · Produksi tepung tapioka</span>
            </div>
          </div>
          <div class="report-id">
            <span>Laporan bulanan</span>
            <strong>{{ labelBulan }}</strong>
          </div>
        </header>

        <div class="report-title">
          <p class="report-kicker">Rekap operasional gudang</p>
          <h2 id="laporan-judul">Laporan Stok &amp; Transaksi Tepung Tapioka</h2>
          <p class="report-period">Periode {{ labelBulan }}</p>
        </div>

        <section class="report-section" aria-labelledby="ikhtisar-judul">
          <div class="report-section__head">
            <h3 id="ikhtisar-judul">Ringkasan Arus Barang Bulan Ini</h3>
            <span class="report-note">
              {{ formatTanggalPendek(`${bulan}-01`) }}–{{ formatTanggal(akhirPeriode) }}
            </span>
          </div>

          <div class="ikhtisar">
            <dl class="ikhtisar-utama">
              <div>
                <dt>Bahan baku masuk</dt>
                <dd class="ikhtisar-angka num">{{ formatKg(ringkasan.masukKg) }}</dd>
                <dd class="ikhtisar-ket">
                  Dari {{ formatAngka(ringkasan.jumlahPemasok) }} pemasok
                </dd>
              </div>
              <div>
                <dt>Total produksi</dt>
                <dd class="ikhtisar-angka num">{{ formatKg(ringkasan.produksiKg) }}</dd>
                <dd class="ikhtisar-ket">Seluruh produk tepung</dd>
              </div>
              <div>
                <dt>Barang terjual</dt>
                <dd class="ikhtisar-angka num">{{ formatKg(ringkasan.keluarKg) }}</dd>
                <dd class="ikhtisar-ket">
                  Ke {{ formatAngka(ringkasan.jumlahPembeli) }} pembeli
                </dd>
              </div>
              <div>
                <dt>Jumlah nota</dt>
                <dd class="ikhtisar-angka num">
                  {{ formatAngka(ringkasan.jumlahNota) }}<small>nota</small>
                </dd>
                <dd class="ikhtisar-ket">Seluruh jenis transaksi</dd>
              </div>
              <div>
                <dt>Nilai penjualan</dt>
                <dd class="ikhtisar-angka num">{{ formatRupiah(ringkasan.nilaiKeluar) }}</dd>
                <dd class="ikhtisar-ket">Dari barang terjual</dd>
              </div>
              <div>
                <dt>Arus bersih</dt>
                <dd class="ikhtisar-angka num">{{ labelKoreksi(arusBersih) }}</dd>
                <dd class="ikhtisar-ket">
                  Produksi + retur ± koreksi − terjual − ditolak
                </dd>
              </div>
            </dl>

            <dl class="arus-baris">
              <div>
                <dt>Retur masuk</dt>
                <dd class="num">{{ tandaMasuk(ringkasan.returKg) }}</dd>
              </div>
              <div>
                <dt>Barang ditolak</dt>
                <dd class="num">{{ tandaKeluar(ringkasan.ditolakKg) }}</dd>
              </div>
              <div>
                <dt>Koreksi bersih</dt>
                <dd class="num">{{ labelKoreksi(ringkasan.koreksiNetKg) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="report-section" aria-labelledby="produk-laporan-judul">
          <div class="report-section__head">
            <h3 id="produk-laporan-judul">Rekap per produk</h3>
            <span class="report-note">Dalam kilogram</span>
          </div>

          <div class="report-table-wrap">
            <table class="report-table">
              <caption class="sr-only">
                Rekap produksi, penjualan, retur, barang ditolak, koreksi,
                dan nilai penjualan per produk tepung.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  <th scope="col" class="col-angka">Produksi</th>
                  <th scope="col" class="col-angka">Penjualan</th>
                  <th scope="col" class="col-angka">Retur</th>
                  <th scope="col" class="col-angka">Ditolak</th>
                  <th scope="col" class="col-angka">Koreksi</th>
                  <th scope="col" class="col-nilai">Nilai penjualan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in rekapProduk" :key="item.id">
                  <td>
                    <strong>{{ item.kemasan }}</strong>
                    <span>{{ item.nama }}</span>
                  </td>
                  <td class="num">{{ formatKg(item.produksiKg) }}</td>
                  <td class="num">{{ formatKg(item.keluarKg) }}</td>
                  <td class="num">{{ formatKg(item.returKg) }}</td>
                  <td class="num">{{ formatKg(item.ditolakKg) }}</td>
                  <td class="num">{{ labelKoreksi(item.koreksiNetKg) }}</td>
                  <td class="num cell-nilai">
                    {{ formatRupiah(item.nilaiKeluar) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td class="num">{{ formatKg(totalProduk.produksiKg) }}</td>
                  <td class="num">{{ formatKg(totalProduk.keluarKg) }}</td>
                  <td class="num">{{ formatKg(totalProduk.returKg) }}</td>
                  <td class="num">{{ formatKg(totalProduk.ditolakKg) }}</td>
                  <td class="num">{{ labelKoreksi(totalProduk.koreksiNetKg) }}</td>
                  <td class="num cell-nilai">
                    {{ formatRupiah(totalProduk.nilaiKeluar) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>


        <footer class="report-foot">
          <div class="report-foot__note">
            <IconApp nama="info" :ukuran="12" />
            Angka dihitung dari data transaksi pada bulan terpilih. Data contoh
            prototipe, bukan data operasional perusahaan.
          </div>
          <div class="ttd">
            <div>
              <span>Dibuat oleh</span>
              <strong>Admin Gudang</strong>
              <small>CV Tani Sadulur</small>
            </div>
            <div>
              <span>Diperiksa oleh</span>
              <strong>Pemilik Pabrik</strong>
              <small>CV Tani Sadulur</small>
            </div>
          </div>
          <p class="generated">
            Dibuat {{ formatTanggal(gudang.hariIni) }} · Prototipe capstone
          </p>
        </footer>

        <section
          class="report-section report-section--rincian"
          aria-labelledby="nota-judul"
        >
          <div class="lampiran-head">
            <p class="report-kicker">Lampiran · Laporan bulanan {{ labelBulan }}</p>
            <h3 id="nota-judul">Rincian transaksi {{ labelBulan }}</h3>
            <p>
              Lembar ini adalah rincian seluruh transaksi gudang pada bulan
              {{ labelBulan }}, dilampirkan sebagai informasi lanjutan dari
              rekap di halaman pertama.
            </p>
          </div>

          <div class="report-section__head">
            <span class="report-note">
              {{ formatAngka(transaksiBulan.length) }} nota ·
              {{ formatTanggalPendek(`${bulan}-01`) }}–{{ formatTanggal(akhirPeriode) }}
            </span>
          </div>

          <div v-if="transaksiBulan.length" class="report-table-wrap">
            <table class="report-table report-table--nota">
              <caption class="sr-only">
                Daftar transaksi pada bulan terpilih.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Dokumen</th>
                  <th scope="col">Jenis</th>
                  <th scope="col">Pihak</th>
                  <th scope="col">Produk</th>
                  <th scope="col" class="col-angka">Jumlah</th>
                  <th scope="col" class="col-angka">Berat</th>
                  <th scope="col" class="col-nilai">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in transaksiBulan" :key="item.id">
                  <td class="cell-date">
                    {{ formatTanggalPendek(item.tanggal) }}
                    <span>{{ item.jam }}</span>
                  </td>
                  <td class="cell-doc">{{ item.nomorDokumen }}</td>
                  <td><JenisBadge :jenis="item.jenis" /></td>
                  <td class="cell-pihak">{{ item.pihak }}</td>
                  <td class="cell-produk">{{ item.produk?.kemasan || '—' }}</td>
                  <td class="num cell-jumlah">{{ jumlahTabel(item) }}</td>
                  <td class="num cell-berat">{{ beratTabel(item) }}</td>
                  <td class="num cell-nilai">
                    {{ item.nilai ? formatRupiah(item.nilai) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="report-empty">
            <IconApp nama="file-text" :ukuran="20" />
            <strong>Belum ada transaksi pada bulan ini</strong>
            <p>Pilih bulan lain atau catat transaksi baru terlebih dahulu.</p>
          </div>
        </section>
      </article>

      <footer class="page-foot no-print">
        <span>
          Gunakan tombol cetak lalu pilih “Simpan sebagai PDF” pada dialog
          browser.
        </span>
        <span>Format A4 · Data contoh</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.laporan-page {
  min-height: 100vh;
}

.content {
  width: 100%;
  max-width: 1160px;
  padding: 26px 30px 34px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.eyebrow__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold-500);
}

.page-head h1 {
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.page-sub {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12.5px;
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 2px;
}

.month-control {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
}

.month-control select {
  max-width: 180px;
  padding-right: 3px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.month-control select:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}

.print-btn {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--brand-800);
  color: #fff;
  font-size: 11px;
  font-weight: 650;
  transition: background 0.15s ease;
}

.print-btn:hover {
  background: var(--brand-900);
}

.report-sheet {
  padding: 26px 28px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.report-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--brand-900);
}

.report-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.report-mark {
  width: 48px;
  height: 38px;
  flex: none;
  object-fit: contain;
}

.report-brand div {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.report-brand strong {
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.report-brand span {
  color: var(--muted);
  font-size: 10px;
}

.report-id {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.35;
  text-align: right;
}

.report-id span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.report-id strong {
  font-size: 12.5px;
  font-weight: 750;
}

.report-title {
  padding: 20px 0 16px;
}

.report-kicker {
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-title h2 {
  margin-top: 3px;
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.report-period {
  margin-top: 3px;
  color: var(--brand-700);
  font-size: 11.5px;
  font-weight: 650;
}

.report-section {
  padding-top: 18px;
}

.report-section + .report-section {
  margin-top: 18px;
  border-top: 1px solid var(--border);
}

.report-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.report-section__head h3 {
  font-size: 12.5px;
  font-weight: 700;
}

/* Satu panel: enam angka kunci (3+3), lalu penyesuaian stok di pita bawah. */
.ikhtisar {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.ikhtisar dl {
  margin: 0;
}

.ikhtisar dd {
  margin-inline-start: 0;
}

.ikhtisar-utama {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ikhtisar-utama > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 13px 16px 12px;
}

.ikhtisar-utama > div:not(:nth-child(3n + 1)) {
  border-left: 1px solid var(--border);
}

.ikhtisar-utama > div:nth-child(n + 4) {
  border-top: 1px solid var(--border);
}

.ikhtisar dt {
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ikhtisar-angka {
  margin-top: 5px;
  color: var(--text);
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.15;
  white-space: nowrap;
}

.ikhtisar-angka small {
  margin-left: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.ikhtisar-ket {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}

.arus-baris {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--border);
  background: var(--surface-soft);
}

.arus-baris > div {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 16px;
}

.arus-baris > div + div {
  border-left: 1px solid var(--border);
}

.arus-baris dd {
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.report-note {
  color: var(--muted);
  font-size: 9.5px;
}

.report-table-wrap {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  min-width: 660px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.report-table th {
  padding: 8px 8px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.report-table td {
  padding: 8px;
  border-bottom: 1px solid #eef1ea;
  color: var(--text-secondary);
  font-size: 10px;
  vertical-align: middle;
}

.report-table tbody tr:last-child td {
  border-bottom: 0;
}

.report-table td > strong {
  display: block;
  color: var(--text);
  font-size: 10.5px;
  font-weight: 650;
}

.report-table td > span:not(.status-badge) {
  display: block;
  color: var(--muted);
  font-size: 8.5px;
}

.report-table .col-angka {
  text-align: right;
}

.report-table .col-nilai {
  text-align: right;
}

.report-table td.num {
  color: var(--text);
  font-size: 9.5px;
  text-align: right;
  white-space: nowrap;
}

.report-table tfoot th,
.report-table tfoot td {
  border-top: 1px solid var(--border-strong);
  border-bottom: 0;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 9.5px;
  font-weight: 750;
}

.report-table tfoot th {
  text-transform: none;
  letter-spacing: 0;
}

.report-table--nota {
  min-width: 820px;
}

.report-table--nota th:nth-child(1) {
  width: 8%;
}

.report-table--nota th:nth-child(2) {
  width: 15%;
}

.report-table--nota th:nth-child(3) {
  width: 11%;
}

.report-table--nota th:nth-child(4) {
  width: 17%;
}

.report-table--nota th:nth-child(5) {
  width: 14%;
}

.report-table--nota th:nth-child(6) {
  width: 9%;
}

.report-table--nota th:nth-child(7) {
  width: 10%;
}

.report-table--nota th:nth-child(8) {
  width: 16%;
}

.cell-date {
  white-space: nowrap;
}

.cell-date span {
  display: block;
  color: var(--muted);
  font-size: 8.5px;
}

.cell-doc {
  color: var(--brand-700);
  font-size: 9px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cell-pihak,
.cell-produk {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-jumlah,
.cell-berat {
  white-space: nowrap;
}

.cell-nilai {
  white-space: nowrap;
}

.report-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  background: var(--surface-soft);
  text-align: center;
}

.report-empty :deep(.icon) {
  margin-bottom: 8px;
  color: var(--muted);
}

.report-empty strong {
  font-size: 12px;
  font-weight: 650;
}

.report-empty p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

/* Lampiran dimulai di halaman baru saat dicetak; di layar dipisah garis putus. */
.report-section--rincian {
  padding-top: 22px;
  margin-top: 26px;
  border-top: 2px dashed var(--border);
}

.lampiran-head {
  margin-bottom: 12px;
}

.lampiran-head h3 {
  margin-top: 3px;
  font-size: 15px;
  font-weight: 750;
}

.lampiran-head p:last-child {
  max-width: 620px;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.5;
}

.report-foot {
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px solid var(--border);
}

.report-foot__note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  max-width: 720px;
  color: var(--muted);
  font-size: 8.5px;
  line-height: 1.5;
}

.report-foot__note :deep(.icon) {
  margin-top: 1px;
}

.ttd {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  max-width: 420px;
  margin: 20px 0 0 auto;
}

.ttd > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 30px;
  text-align: center;
}

.ttd span {
  color: var(--muted);
  font-size: 8.5px;
}

.ttd strong {
  font-size: 10.5px;
  font-weight: 650;
}

.ttd small {
  color: var(--muted);
  font-size: 8.5px;
}

.generated {
  margin-top: 12px;
  color: var(--muted);
  font-size: 8px;
  text-align: right;
}

.page-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 18px;
  margin-top: 22px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 9.5px;
}

@media (max-width: 1024px) {
  .content {
    padding: 22px 20px 30px;
  }
}

@media (max-width: 760px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-head h1 {
    font-size: 24px;
  }

  .page-head__actions {
    width: 100%;
  }

  .month-control {
    flex: 1;
  }

  .month-control select {
    width: 100%;
    max-width: none;
  }

  .report-sheet {
    padding: 18px 16px;
  }

  .report-head {
    flex-direction: column;
    gap: 10px;
  }

  .report-id {
    align-items: flex-start;
    text-align: left;
  }

  .report-title h2 {
    font-size: 18px;
  }

  .report-section__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .report-table-wrap {
    overflow-x: auto;
  }

  .ttd {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 18px 12px 26px;
  }

  .ikhtisar-utama,
  .arus-baris {
    grid-template-columns: minmax(0, 1fr);
  }

  .ikhtisar-utama > div:not(:nth-child(3n + 1)),
  .arus-baris > div + div {
    border-left: 0;
  }

  .ikhtisar-utama > div + div,
  .arus-baris > div + div {
    border-top: 1px solid var(--border);
  }

  .print-btn {
    flex: 1;
    justify-content: center;
  }

  .generated {
    text-align: left;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .content {
    width: auto;
    max-width: none;
    padding: 0;
  }

  .report-sheet {
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .report-head {
    padding-bottom: 10px;
  }

  .report-title {
    padding: 12px 0;
  }

  .report-section,
  .report-foot {
    break-inside: avoid;
  }

  .report-section--rincian {
    padding-top: 0;
    margin-top: 0;
    border-top: 0;
    break-before: page;
    break-inside: auto;
  }

  .report-section__head {
    break-after: avoid;
  }

  .report-table thead {
    display: table-header-group;
  }

  .report-table {
    min-width: 0;
  }

  .report-table--nota {
    min-width: 0;
  }

  .report-table th,
  .report-table td {
    padding: 4px 5px;
    font-size: 7.5pt;
  }

  .report-table td > strong {
    font-size: 8pt;
  }

  .report-table .num {
    font-size: 7.5pt;
  }

  .report-table-wrap {
    overflow: visible;
  }

  .report-table tr {
    break-inside: avoid;
  }

  .report-foot__note {
    max-width: none;
  }
}
</style>
