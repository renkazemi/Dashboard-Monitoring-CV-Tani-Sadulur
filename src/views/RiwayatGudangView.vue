<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import DetailTransaksi from '../components/transaksi/DetailTransaksi.vue'
import JenisBadge from '../components/transaksi/JenisBadge.vue'
import {
  JENIS_BY_VALUE,
  JENIS_TRANSAKSI,
} from '../data/jenisTransaksi'
import { gudang } from '../stores/gudang'
import { isAdmin } from '../stores/auth'
import {
  formatAngka,
  formatHari,
  formatKg,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggal,
  formatTanggalPendek,
} from '../utils/format'

const PER_HALAMAN = 10

const hariIni = gudang.hariIni
const hariIniLabel = formatHari(hariIni)
const produkMap = computed(() =>
  Object.fromEntries(gudang.produk.map((item) => [item.id, item])),
)

const isoLokal = (tanggal) => {
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0')
  const hari = String(tanggal.getDate()).padStart(2, '0')
  return `${tanggal.getFullYear()}-${bulan}-${hari}`
}

const geserHari = (iso, jumlah) => {
  const tanggal = new Date(`${iso}T12:00:00`)
  tanggal.setDate(tanggal.getDate() + jumlah)
  return isoLokal(tanggal)
}

const defaultDari = geserHari(hariIni, -29)
const defaultSampai = hariIni

const cari = ref('')
const jenis = ref('semua')
const produkId = ref('semua')
const dari = ref(defaultDari)
const sampai = ref(defaultSampai)
const preset = ref('30')
const urut = ref('baru')
const halaman = ref(1)
const transaksiDetail = ref(null)

const transaksiLengkap = computed(() =>
  gudang.transaksi.map((item) => {
    const info = JENIS_BY_VALUE[item.jenis]
    const produk = produkMap.value[item.produkId] || null
    const negatif =
      ['keluar', 'ditolak'].includes(item.jenis) ||
      (item.jenis === 'koreksi' &&
        (item.arah === 'kurang' || Number(item.beratKg) < 0)) ||
      Number(item.beratKg) < 0

    return {
      ...item,
      info,
      produk,
      negatif,
      // Produksi tidak punya pihak; tampilkan batch yang dihasilkan.
      pihakLabel: item.jenis === 'produksi' ? `Batch ${item.batchKode}` : item.pihak,
      beratAbs: Math.abs(Number(item.beratKg) || 0),
      jumlahAbs: Math.abs(Number(item.jumlah) || 0),
      nilai: Number(item.nilai) || 0,
      waktu: `${item.tanggal}T${item.jam || '00:00'}`,
    }
  }),
)

const rentangTidakValid = computed(
  () => Boolean(dari.value && sampai.value && dari.value > sampai.value),
)

const hasilFilter = computed(() => {
  if (rentangTidakValid.value) return []

  const kata = cari.value.trim().toLowerCase()
  const daftar = transaksiLengkap.value.filter((item) => {
    if (jenis.value !== 'semua' && item.jenis !== jenis.value) return false
    if (produkId.value !== 'semua' && item.produkId !== produkId.value) {
      return false
    }
    if (dari.value && item.tanggal < dari.value) return false
    if (sampai.value && item.tanggal > sampai.value) return false

    if (kata) {
      const teks = [
        item.nomorDokumen,
        item.pihakLabel,
        item.keterangan,
        item.produk?.nama,
        item.produk?.kemasan,
        item.info?.label,
        item.info?.pendek,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (!teks.includes(kata)) return false
    }

    return true
  })

  return daftar.sort((a, b) =>
    urut.value === 'baru'
      ? b.waktu.localeCompare(a.waktu) ||
        (b.dibuat || 0) - (a.dibuat || 0)
      : a.waktu.localeCompare(b.waktu) ||
        (a.dibuat || 0) - (b.dibuat || 0),
  )
})

const ringkasan = computed(() => {
  const daftar = hasilFilter.value
  const jumlahkan = (filterJenis, ambil) =>
    daftar
      .filter((item) => item.jenis === filterJenis)
      .reduce((total, item) => total + ambil(item), 0)

  return {
    jumlah: daftar.length,
    masukKg: jumlahkan('masuk', (item) => item.beratAbs),
    produksiKg: jumlahkan('produksi', (item) => item.beratAbs),
    batchProduksi: new Set(
      daftar.filter((item) => item.jenis === 'produksi').map((item) => item.batchKode),
    ).size,
    keluarKg: jumlahkan('keluar', (item) => item.beratAbs),
    nilaiKeluar: jumlahkan('keluar', (item) => item.nilai),
  }
})

const labelPeriode = computed(() => {
  if (!dari.value && !sampai.value) return 'Semua periode'
  if (dari.value && sampai.value) {
    if (dari.value === sampai.value) return formatTanggal(dari.value)
    return `${formatTanggalPendek(dari.value)} – ${formatTanggal(sampai.value)}`
  }
  if (dari.value) return `Sejak ${formatTanggal(dari.value)}`
  return `Sampai ${formatTanggal(sampai.value)}`
})

const adaFilterAktif = computed(
  () =>
    Boolean(cari.value.trim()) ||
    jenis.value !== 'semua' ||
    produkId.value !== 'semua' ||
    dari.value !== defaultDari ||
    sampai.value !== defaultSampai ||
    urut.value !== 'baru',
)

const totalHalaman = computed(() =>
  Math.max(1, Math.ceil(hasilFilter.value.length / PER_HALAMAN)),
)

const halamanAman = computed(() =>
  Math.min(halaman.value, totalHalaman.value),
)

const baris = computed(() => {
  const mulai = (halamanAman.value - 1) * PER_HALAMAN
  return hasilFilter.value.slice(mulai, mulai + PER_HALAMAN)
})

const nomorAwal = computed(() =>
  hasilFilter.value.length
    ? (halamanAman.value - 1) * PER_HALAMAN + 1
    : 0,
)

const nomorAkhir = computed(() =>
  Math.min(halamanAman.value * PER_HALAMAN, hasilFilter.value.length),
)

const halamanTampil = computed(() => {
  const total = totalHalaman.value
  const aktif = halamanAman.value

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => ({
      nomor: index + 1,
      kunci: index + 1,
    }))
  }

  const nomor = [
    ...new Set([1, total, aktif - 1, aktif, aktif + 1]),
  ]
    .filter((item) => item >= 1 && item <= total)
    .sort((a, b) => a - b)

  const hasil = []
  let sebelumnya = 0
  nomor.forEach((item) => {
    if (item - sebelumnya > 1) {
      hasil.push({ elipsis: true, kunci: `elipsis-${item}` })
    }
    hasil.push({ nomor: item, kunci: item })
    sebelumnya = item
  })
  return hasil
})

watch([cari, jenis, produkId, dari, sampai, urut], () => {
  halaman.value = 1
})

watch(totalHalaman, (total) => {
  if (halaman.value > total) halaman.value = total
})

function terapkanPreset(nilai) {
  preset.value = nilai

  if (nilai === '7') {
    dari.value = geserHari(hariIni, -6)
    sampai.value = hariIni
  } else if (nilai === '30') {
    dari.value = defaultDari
    sampai.value = defaultSampai
  } else if (nilai === 'bulan') {
    dari.value = `${hariIni.slice(0, 7)}-01`
    sampai.value = hariIni
  } else {
    dari.value = ''
    sampai.value = ''
  }
}

function resetFilter() {
  cari.value = ''
  jenis.value = 'semua'
  produkId.value = 'semua'
  preset.value = '30'
  dari.value = defaultDari
  sampai.value = defaultSampai
  urut.value = 'baru'
  halaman.value = 1
}

function keHalaman(nomor) {
  halaman.value = Math.min(Math.max(1, nomor), totalHalaman.value)
}

function satuanProduk(item) {
  const kemasan = item.produk?.kemasan?.toLowerCase() || ''
  if (kemasan.startsWith('dus')) return 'dus'
  if (kemasan.startsWith('karung')) return 'karung'
  return 'kg'
}

function jumlahTabel(item) {
  if (item.jenis === 'masuk' || !item.produk) return '—'
  const tanda = item.jenis === 'koreksi' && item.negatif ? '\u2212' : ''
  return `${tanda}${formatAngka(item.jumlahAbs)} ${satuanProduk(item)}`
}

function bukaDetail(item) {
  transaksiDetail.value = item
}

function tutupDetail() {
  transaksiDetail.value = null
}
</script>

<template>
  <div class="daftar-page">
    <AppTopbar :tanggal="hariIniLabel" halaman="Riwayat gudang" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Riwayat gudang</h1>
          <p class="page-sub">
            Telusuri nota gudang, periksa alokasi batch, dan nilai transaksi
            dalam satu tempat.
          </p>
        </div>

        <div class="page-head__actions">
          <span class="date-pill" :title="labelPeriode">
            <IconApp nama="calendar" :ukuran="14" />
            {{ labelPeriode }}
          </span>
          <RouterLink v-if="isAdmin" to="/catat-informasi" class="input-btn">
            <IconApp nama="plus" :ukuran="14" />
            Catat informasi
          </RouterLink>
        </div>
      </header>

      <section class="ringkasan" aria-label="Ringkasan transaksi terfilter">
        <div class="ringkasan__item">
          <span class="ringkasan__icon">
            <IconApp nama="receipt" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Transaksi</span>
            <strong class="ringkasan__value num">
              {{ formatAngka(ringkasan.jumlah) }}
              <small>nota</small>
            </strong>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-masuk">
            <IconApp nama="truck" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Bahan masuk</span>
            <strong class="ringkasan__value num">
              {{ formatKg(ringkasan.masukKg) }}
            </strong>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-produksi">
            <IconApp nama="factory" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Hasil produksi</span>
            <strong
              class="ringkasan__value num"
              :title="`${formatKg(ringkasan.produksiKg)} dari ${ringkasan.batchProduksi} batch`"
            >
              {{ formatKg(ringkasan.produksiKg) }}
              <small>{{ ringkasan.batchProduksi }} batch</small>
            </strong>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-keluar">
            <IconApp nama="arrow-up-right" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Tepung keluar</span>
            <strong class="ringkasan__value num">
              {{ formatKg(ringkasan.keluarKg) }}
            </strong>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-nilai">
            <IconApp nama="wallet" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Nilai keluar</span>
            <strong
              class="ringkasan__value num"
              :title="formatRupiah(ringkasan.nilaiKeluar)"
            >
              {{ formatRupiahRingkas(ringkasan.nilaiKeluar) }}
            </strong>
          </div>
        </div>
      </section>

      <section class="panel filter-panel" aria-labelledby="filter-judul">
        <div class="filter-head">
          <div>
            <h2 id="filter-judul" class="filter-title">Filter</h2>
            <p class="filter-sub">
              {{ labelPeriode }} · {{ formatAngka(hasilFilter.length) }} nota
            </p>
          </div>
          <button
            class="reset-btn"
            type="button"
            :disabled="!adaFilterAktif"
            @click="resetFilter"
          >
            <IconApp nama="undo" :ukuran="12" />
            Reset
          </button>
        </div>

        <div class="filter-controls">
          <div class="filter-field filter-field--cari">
            <label for="filter-cari">Cari</label>
            <div class="input-wrap">
              <IconApp nama="search" :ukuran="14" />
              <input
                id="filter-cari"
                v-model="cari"
                type="search"
                placeholder="Nomor dokumen, pihak, keterangan..."
                autocomplete="off"
              />
            </div>
          </div>

          <div class="filter-field">
            <label for="filter-jenis">Jenis</label>
            <select id="filter-jenis" v-model="jenis">
              <option value="semua">Semua jenis</option>
              <option
                v-for="item in JENIS_TRANSAKSI"
                :key="item.value"
                :value="item.value"
              >
                {{ item.pendek }}
              </option>
            </select>
          </div>

          <div class="filter-field">
            <label for="filter-produk">Produk</label>
            <select id="filter-produk" v-model="produkId">
              <option value="semua">Semua produk</option>
              <option
                v-for="item in gudang.produk"
                :key="item.id"
                :value="item.id"
              >
                {{ item.kemasan }}
              </option>
            </select>
          </div>

          <div class="filter-field">
            <label for="filter-dari">Dari tanggal</label>
            <input
              id="filter-dari"
              v-model="dari"
              type="date"
              :max="sampai || hariIni"
              @change="preset = 'custom'"
            />
          </div>

          <div class="filter-field">
            <label for="filter-sampai">Sampai tanggal</label>
            <input
              id="filter-sampai"
              v-model="sampai"
              type="date"
              :min="dari || undefined"
              :max="hariIni"
              @change="preset = 'custom'"
            />
          </div>
        </div>

        <div class="filter-foot">
          <div class="presets" role="group" aria-label="Rentang tanggal cepat">
            <button
              v-for="opsi in [
                { value: '7', label: '7 hari' },
                { value: '30', label: '30 hari' },
                { value: 'bulan', label: 'Bulan ini' },
                { value: 'semua', label: 'Semua' },
              ]"
              :key="opsi.value"
              type="button"
              class="preset-btn"
              :class="{ 'is-active': preset === opsi.value }"
              :aria-pressed="preset === opsi.value"
              @click="terapkanPreset(opsi.value)"
            >
              {{ opsi.label }}
            </button>
          </div>

          <span class="filter-hint">
            <IconApp nama="info" :ukuran="12" />
            Rentang awal tidak boleh melewati tanggal akhir
          </span>
        </div>
      </section>

      <section class="panel daftar-panel" aria-labelledby="daftar-judul">
        <div class="panel-head daftar-head">
          <div>
            <h2 id="daftar-judul" class="panel-title">
              Daftar nota
              <span class="count-chip num">{{ formatAngka(hasilFilter.length) }}</span>
            </h2>
            <p class="panel-sub">
              Pilih detail untuk melihat keterangan dan alokasi batch.
            </p>
          </div>

          <div class="sort-control">
            <label for="urut-transaksi">Urutkan</label>
            <select id="urut-transaksi" v-model="urut">
              <option value="baru">Terbaru dulu</option>
              <option value="lama">Terlama dulu</option>
            </select>
          </div>
        </div>

        <div class="panel-body daftar-body">
          <div
            v-if="rentangTidakValid"
            class="alert"
            role="alert"
          >
            <IconApp nama="alert-triangle" :ukuran="15" />
            <span>
              Tanggal awal melewati tanggal akhir. Perbaiki rentang tanggal
              atau pilih salah satu preset.
            </span>
          </div>

          <div v-else-if="!hasilFilter.length" class="empty">
            <span class="empty__icon">
              <IconApp nama="search" :ukuran="22" />
            </span>
            <strong>Tidak ada transaksi yang cocok</strong>
            <p>
              Coba ubah kata kunci, jenis transaksi, produk, atau rentang
              tanggal.
            </p>
            <button type="button" class="empty__btn" @click="resetFilter">
              Tampilkan 30 hari terakhir
            </button>
          </div>

          <template v-else>
            <div class="table-wrap">
              <table class="trx-table">
                <caption class="sr-only">
                  Riwayat gudang yang sudah difilter, diurutkan
                  {{ urut === 'baru' ? 'terbaru' : 'terlama' }}.
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      :aria-sort="urut === 'baru' ? 'descending' : 'ascending'"
                    >
                      Tanggal
                    </th>
                    <th scope="col">Dokumen</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Pihak</th>
                    <th scope="col">Produk</th>
                    <th scope="col" class="col-jumlah">Jumlah</th>
                    <th scope="col" class="col-berat">Berat</th>
                    <th scope="col" class="col-nilai">Nilai</th>
                    <th scope="col" class="col-aksi">
                      <span class="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in baris" :key="item.id">
                    <td data-label="Tanggal" class="cell-date">
                      <span class="date-main">{{ formatTanggal(item.tanggal) }}</span>
                      <span class="date-sub">{{ item.jam }} WIB</span>
                    </td>
                    <td data-label="Dokumen">
                      <span class="doc-code">{{ item.nomorDokumen }}</span>
                    </td>
                    <td data-label="Jenis">
                      <JenisBadge :jenis="item.jenis" />
                    </td>
                    <td data-label="Pihak">
                      <span class="ellipsis" :title="item.pihakLabel">
                        {{ item.pihakLabel }}
                      </span>
                      <span
                        v-if="item.keterangan && JENIS_BY_VALUE[item.jenis]?.alasan"
                        class="ellipsis alasan-sub"
                        :title="item.keterangan"
                      >
                        {{ item.keterangan }}
                      </span>
                    </td>
                    <td data-label="Produk">
                      <span
                        class="ellipsis"
                        :title="
                          item.produk
                            ? `${item.produk.nama} · ${item.produk.kemasan}`
                            : ''
                        "
                      >
                        {{ item.produk?.kemasan || '—' }}
                      </span>
                    </td>
                    <td data-label="Jumlah" class="cell-jumlah num">
                      {{ jumlahTabel(item) }}
                    </td>
                    <td
                      data-label="Berat"
                      class="cell-berat num"
                      :class="{ 'is-negatif': item.negatif }"
                    >
                      {{ item.negatif ? '\u2212' : '' }}{{ formatKg(item.beratAbs) }}
                    </td>
                    <td data-label="Nilai" class="cell-nilai num">
                      {{ item.nilai ? formatRupiah(item.nilai) : '—' }}
                    </td>
                    <td class="cell-aksi">
                      <button
                        type="button"
                        class="detail-btn"
                        :aria-label="`Lihat detail ${item.nomorDokumen}`"
                        @click="bukaDetail(item)"
                      >
                        Detail
                        <IconApp nama="chevron-right" :ukuran="12" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ul class="trx-cards">
              <li v-for="item in baris" :key="item.id" class="trx-card">
                <div class="trx-card__top">
                  <JenisBadge :jenis="item.jenis" />
                  <span class="trx-card__date">
                    {{ formatTanggal(item.tanggal) }} · {{ item.jam }}
                  </span>
                </div>

                <div class="trx-card__title">
                  <strong class="doc-code">{{ item.nomorDokumen }}</strong>
                  <span class="ellipsis" :title="item.pihakLabel">
                    {{ item.pihakLabel }}
                  </span>
                  <span
                    v-if="item.keterangan && JENIS_BY_VALUE[item.jenis]?.alasan"
                    class="ellipsis alasan-sub"
                    :title="item.keterangan"
                  >
                    {{ item.keterangan }}
                  </span>
                </div>

                <div class="trx-card__meta">
                  <span>{{ item.produk?.kemasan || '—' }}</span>
                  <span class="num">{{ jumlahTabel(item) }}</span>
                </div>

                <div class="trx-card__foot">
                  <span
                    class="trx-card__berat num"
                    :class="{ 'is-negatif': item.negatif }"
                  >
                    {{ item.negatif ? '\u2212' : '' }}{{ formatKg(item.beratAbs) }}
                  </span>
                  <span v-if="item.nilai" class="trx-card__nilai num">
                    {{ formatRupiah(item.nilai) }}
                  </span>
                  <button
                    type="button"
                    class="detail-btn"
                    :aria-label="`Lihat detail ${item.nomorDokumen}`"
                    @click="bukaDetail(item)"
                  >
                    Detail
                    <IconApp nama="chevron-right" :ukuran="12" />
                  </button>
                </div>
              </li>
            </ul>

            <div class="table-foot">
              <span class="foot-info" aria-live="polite">
                Menampilkan {{ formatAngka(nomorAwal) }}–{{
                  formatAngka(nomorAkhir)
                }}
                dari {{ formatAngka(hasilFilter.length) }} transaksi
              </span>

              <nav class="pager" aria-label="Navigasi halaman transaksi">
                <button
                  type="button"
                  class="page-btn"
                  :disabled="halamanAman === 1"
                  aria-label="Halaman sebelumnya"
                  @click="keHalaman(halamanAman - 1)"
                >
                  <IconApp nama="chevron-left" :ukuran="13" />
                </button>

                <template v-for="item in halamanTampil" :key="item.kunci">
                  <span v-if="item.elipsis" class="page-ellipsis">…</span>
                  <button
                    v-else
                    type="button"
                    class="page-btn page-btn--nomor"
                    :class="{ 'is-active': item.nomor === halamanAman }"
                    :aria-current="item.nomor === halamanAman ? 'page' : undefined"
                    :aria-label="`Halaman ${item.nomor}`"
                    @click="keHalaman(item.nomor)"
                  >
                    {{ item.nomor }}
                  </button>
                </template>

                <button
                  type="button"
                  class="page-btn"
                  :disabled="halamanAman === totalHalaman"
                  aria-label="Halaman berikutnya"
                  @click="keHalaman(halamanAman + 1)"
                >
                  <IconApp nama="chevron-right" :ukuran="13" />
                </button>
              </nav>
            </div>
          </template>
        </div>
      </section>

      <footer class="page-foot">
        <span>
          Transaksi hanya-baca · koreksi dilakukan lewat transaksi baru agar
          audit tetap terlacak.
        </span>
        <span>Data contoh · Prototipe capstone</span>
      </footer>
    </main>

    <DetailTransaksi
      v-if="transaksiDetail"
      :transaksi="transaksiDetail"
      @tutup="tutupDetail"
    />
  </div>
</template>

<style scoped>
.daftar-page {
  min-height: 100vh;
}

.content {
  width: 100%;
  max-width: 1480px;
  padding: 26px 30px 34px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
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

.date-pill {
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 6px;
  max-width: 280px;
  padding: 0 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-btn {
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

.input-btn:hover {
  background: var(--brand-900);
}

.ringkasan {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.ringkasan__item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.ringkasan__icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-700);
}

.ringkasan__icon.is-masuk {
  background: var(--positive-soft);
  color: var(--positive);
}

.ringkasan__icon.is-produksi {
  background: var(--brand-50);
  color: var(--brand-600);
}

.ringkasan__icon.is-keluar {
  background: var(--gold-50);
  color: var(--gold-600);
}

.ringkasan__icon.is-nilai {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.ringkasan__label {
  display: block;
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ringkasan__value {
  display: block;
  margin-top: 1px;
  color: var(--text);
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.25;
  white-space: nowrap;
}

.ringkasan__value small {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0;
}

.filter-panel {
  margin-bottom: 14px;
}

.filter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 0;
}

.filter-title {
  font-size: 12.5px;
  font-weight: 700;
}

.filter-sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.reset-btn {
  display: inline-flex;
  height: 28px;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  transition: border-color 0.15s ease, color 0.15s ease,
    background 0.15s ease;
}

.reset-btn:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.reset-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filter-controls {
  display: grid;
  grid-template-columns:
    minmax(210px, 1.5fr) minmax(120px, 0.7fr) minmax(140px, 0.8fr)
    minmax(125px, 0.7fr) minmax(125px, 0.7fr);
  gap: 8px;
  padding: 12px 16px 10px;
}

.filter-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.filter-field label {
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.filter-field input,
.filter-field select {
  width: 100%;
  height: 35px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 11.5px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-field select {
  appearance: none;
  padding-right: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7a70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-position: right 9px center;
  background-repeat: no-repeat;
}

.filter-field input:focus-visible,
.filter-field select:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.input-wrap {
  position: relative;
}

.input-wrap :deep(.icon) {
  position: absolute;
  top: 50%;
  left: 10px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.input-wrap input {
  padding-left: 31px;
}

.filter-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 16px 14px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preset-btn {
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
}

.preset-btn.is-active {
  border-color: var(--brand-800);
  background: var(--brand-800);
  color: #fff;
}

.filter-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 9.5px;
}

.daftar-panel {
  overflow: hidden;
}

.daftar-head {
  flex-wrap: wrap;
  row-gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.count-chip {
  display: inline-grid;
  min-width: 22px;
  height: 18px;
  place-items: center;
  padding: 0 5px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-control label {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 600;
}

.sort-control select {
  height: 30px;
  padding: 0 26px 0 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  appearance: none;
  background-color: var(--surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%236b7a70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.sort-control select:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.daftar-body {
  padding: 0 20px 16px;
}

.table-wrap {
  overflow-x: auto;
}

.trx-table {
  min-width: 880px;
  table-layout: fixed;
}

.trx-table th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.trx-table th:first-child,
.trx-table td:first-child {
  padding-left: 2px;
}

.trx-table th:last-child,
.trx-table td:last-child {
  padding-right: 2px;
}

.trx-table th:nth-child(1) {
  width: 9%;
}

.trx-table th:nth-child(2) {
  width: 13%;
}

.trx-table th:nth-child(3) {
  width: 11%;
}

.trx-table th:nth-child(4) {
  width: 14%;
}

.trx-table th:nth-child(5) {
  width: 13%;
}

.trx-table th:nth-child(6) {
  width: 10%;
}

.trx-table th:nth-child(7) {
  width: 10%;
}

.trx-table th:nth-child(8) {
  width: 12%;
}

.trx-table th:nth-child(9) {
  width: 8%;
}

.trx-table td {
  padding: 11px 8px;
  border-bottom: 1px solid #eef1ea;
  color: var(--text-secondary);
  font-size: 11.5px;
  vertical-align: middle;
}

.trx-table tbody tr {
  transition: background 0.13s ease;
}

.trx-table tbody tr:hover {
  background: var(--surface-soft);
}

.trx-table tbody tr:last-child td {
  border-bottom: 0;
}

.cell-date {
  white-space: nowrap;
}

.date-main {
  display: block;
  color: var(--text);
  font-size: 11.5px;
  font-weight: 600;
}

.date-sub {
  display: block;
  color: var(--muted);
  font-size: 9.5px;
}

.ellipsis.alasan-sub,
.trx-card__title .ellipsis.alasan-sub {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9.5px;
  font-style: italic;
}

.doc-code {
  display: inline-block;
  max-width: 100%;
  padding: 2px 6px;
  overflow: hidden;
  border: 1px solid #e2ece6;
  border-radius: 5px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: 0.02em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ellipsis {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-jumlah,
.cell-berat,
.cell-nilai {
  white-space: nowrap;
}

.cell-jumlah {
  font-size: 10.5px;
}

.cell-nilai {
  font-size: 11px;
}

.cell-berat.is-negatif {
  color: var(--danger);
}

.col-nilai,
.cell-nilai {
  text-align: right;
}

.col-aksi,
.cell-aksi {
  padding-left: 4px;
  text-align: right;
}

.detail-btn {
  display: inline-flex;
  height: 26px;
  align-items: center;
  gap: 2px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 9.5px;
  font-weight: 650;
  white-space: nowrap;
  transition: border-color 0.15s ease, color 0.15s ease,
    background 0.15s ease;
}

.detail-btn:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
  color: var(--brand-700);
}

.trx-cards {
  display: none;
  flex-direction: column;
  gap: 9px;
}

.trx-card {
  padding: 12px 13px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
}

.trx-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.trx-card__date {
  color: var(--muted);
  font-size: 9.5px;
  white-space: nowrap;
}

.trx-card__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.trx-card__title .doc-code {
  max-width: 100%;
}

.trx-card__title .ellipsis {
  max-width: 100%;
  color: var(--text-secondary);
  font-size: 11px;
}

.trx-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed var(--border);
  color: var(--muted);
  font-size: 10px;
}

.trx-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 7px;
}

.trx-card__berat {
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.trx-card__berat.is-negatif {
  color: var(--danger);
}

.trx-card__nilai {
  color: var(--muted);
  font-size: 10.5px;
}

.trx-card__foot .detail-btn {
  margin-left: auto;
}

.table-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}

.foot-info {
  color: var(--muted);
  font-size: 10px;
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.page-btn {
  display: grid;
  min-width: 28px;
  height: 28px;
  place-items: center;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 650;
  transition: border-color 0.15s ease, background 0.15s ease,
    color 0.15s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn.is-active {
  border-color: var(--brand-800);
  background: var(--brand-800);
  color: #fff;
}

.page-ellipsis {
  display: grid;
  min-width: 20px;
  height: 28px;
  place-items: center;
  color: var(--muted);
  font-size: 10px;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--danger-border);
  border-radius: 9px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 10.5px;
  line-height: 1.5;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 46px 16px;
  text-align: center;
}

.empty__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  margin-bottom: 11px;
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
}

.empty strong {
  font-size: 12.5px;
  font-weight: 650;
}

.empty p {
  max-width: 320px;
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
}

.empty__btn {
  margin-top: 13px;
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
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

/* Lima ringkasan: tiga di baris atas, dua lebih lebar di baris bawah. */
@media (max-width: 1360px) {
  .ringkasan {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .ringkasan__item {
    grid-column: span 2;
  }

  .ringkasan__item:nth-child(n + 4) {
    grid-column: span 3;
  }
}

@media (max-width: 1100px) {
  .filter-controls {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-field--cari {
    grid-column: span 2;
  }
}

@media (max-width: 980px) {
  .table-wrap {
    display: none;
  }

  .trx-cards {
    display: flex;
  }
}

@media (max-width: 1024px) {
  .content {
    padding: 22px 20px 30px;
  }
}

@media (max-width: 760px) {
  .ringkasan {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .ringkasan__item,
  .ringkasan__item:nth-child(n + 4) {
    grid-column: auto;
    padding: 11px 12px;
  }

  .ringkasan__item:last-child {
    grid-column: 1 / -1;
  }

  .ringkasan__value small {
    display: block;
  }

  .ringkasan__value {
    font-size: 14.5px;
  }
}

@media (max-width: 640px) {
  .content {
    padding: 18px 16px 26px;
  }

  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-head h1 {
    font-size: 24px;
  }

  .page-sub {
    font-size: 12px;
  }

  .page-head__actions {
    width: 100%;
  }

  .date-pill {
    flex: 1;
    max-width: none;
  }

  .filter-controls {
    grid-template-columns: minmax(0, 1fr);
    padding-top: 10px;
  }

  .filter-field--cari {
    grid-column: auto;
  }

  .filter-hint {
    display: none;
  }

  .daftar-body {
    padding: 0 16px 14px;
  }

  .daftar-head {
    padding: 16px 16px 12px;
  }

  .sort-control {
    width: 100%;
    justify-content: space-between;
  }

  .trx-card__foot .detail-btn {
    margin-left: auto;
  }

  .table-foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .pager {
    width: 100%;
  }

  .page-foot {
    font-size: 9px;
  }
}
</style>
