<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import FifoPreview from '../components/input/FifoPreview.vue'
import TransaksiBerhasil from '../components/input/TransaksiBerhasil.vue'
import {
  JENIS_BERKEMASAN,
  JENIS_BY_VALUE,
  JENIS_TRANSAKSI,
} from '../data/jenisTransaksi'
import {
  batchBisaRetur,
  batchProduksi,
  gudang,
  kodeBatch,
  nomorDokumenBerikut,
  nomorDokumenDipakai,
  produkById,
  rencanaFifo,
  simpanTransaksi,
  stokProduk,
} from '../stores/gudang'
import {
  formatAngka,
  formatHari,
  formatKg,
  formatRupiah,
  formatTanggal,
} from '../utils/format'

const hariIni = formatHari(gudang.hariIni)

const jenis = ref('masuk')
const hasil = ref(null)
const riwayat = ref([])
const pesanSistem = ref('')
const menyimpan = ref(false)
const nomorOtomatis = ref(true)

const form = reactive({
  tanggal: gudang.hariIni,
  nomorDokumen: nomorDokumenBerikut('masuk'),
  pihak: '',
  produkId: 'tt50',
  jumlah: '',
  beratKg: '',
  hargaSatuan: '',
  arah: 'kurang',
  batchId: '',
  keterangan: '',
})

const errors = reactive({})

const infoJenis = computed(() => JENIS_BY_VALUE[jenis.value])
const produkTepung = computed(() =>
  gudang.produk.filter((item) => item.jenis === 'tepung'),
)

const daftarPemasok = computed(() =>
  [...new Set(
    gudang.transaksi
      .filter((item) => item.jenis === 'masuk')
      .map((item) => item.pihak),
  )].sort(),
)

const daftarPembeli = computed(() =>
  [...new Set(
    gudang.transaksi
      .filter((item) => ['keluar', 'retur', 'ditolak'].includes(item.jenis))
      .map((item) => item.pihak),
  )].sort(),
)

const butuhPihak = computed(() =>
  ['masuk', 'keluar', 'retur', 'ditolak'].includes(jenis.value),
)
const butuhProduk = computed(() => JENIS_BERKEMASAN.includes(jenis.value))
const butuhHarga = computed(() => jenis.value === 'keluar')
const butuhAlasan = computed(() => infoJenis.value.alasan)
const mengurangiStok = computed(
  () =>
    ['keluar', 'ditolak'].includes(jenis.value) ||
    (jenis.value === 'koreksi' && form.arah === 'kurang'),
)

const produkTerpilih = computed(() => produkById(form.produkId))

const satuanKemasan = computed(() => {
  if (!produkTerpilih.value) return 'unit'
  return produkTerpilih.value.kemasan.toLowerCase().startsWith('dus')
    ? 'dus'
    : 'karung'
})

const beratHitung = computed(() => {
  if (jenis.value === 'masuk') return Math.max(0, Number(form.beratKg) || 0)
  const jumlah = Math.max(0, Number(form.jumlah) || 0)
  return produkTerpilih.value
    ? jumlah * produkTerpilih.value.beratPerSatuan
    : 0
})

const nilaiHitung = computed(() => {
  if (!produkTerpilih.value) return 0
  const jumlah = Math.max(0, Number(form.jumlah) || 0)
  if (jenis.value === 'keluar') {
    return jumlah * Math.max(0, Number(form.hargaSatuan) || 0)
  }
  if (['retur', 'ditolak'].includes(jenis.value)) {
    return jumlah * produkTerpilih.value.hargaSatuan
  }
  return 0
})

const daftarBatchRetur = computed(() =>
  jenis.value === 'retur' && produkTerpilih.value
    ? batchBisaRetur(produkTerpilih.value.id)
    : [],
)
const batchReturTerpilih = computed(
  () => daftarBatchRetur.value.find((item) => item.batch.id === form.batchId) || null,
)

const stokSaatIni = computed(() =>
  produkTerpilih.value ? stokProduk(produkTerpilih.value.id) : 0,
)

const stokSetelah = computed(() => {
  if (!produkTerpilih.value) return 0
  if (mengurangiStok.value) {
    return Math.max(0, stokSaatIni.value - beratHitung.value)
  }
  return stokSaatIni.value + beratHitung.value
})

const fifo = computed(() => {
  if (
    !mengurangiStok.value ||
    !produkTerpilih.value ||
    beratHitung.value <= 0
  ) {
    return null
  }
  return rencanaFifo(produkTerpilih.value.id, beratHitung.value)
})

const kekuranganKg = computed(() => fifo.value?.kekuranganKg || 0)

const batchInfo = computed(() => {
  if (jenis.value !== 'produksi' || !produkTerpilih.value) return null
  const ada = batchProduksi(produkTerpilih.value.id, form.tanggal)
  return {
    kode: ada
      ? ada.kode
      : kodeBatch(produkTerpilih.value, form.tanggal),
    baru: !ada,
  }
})

const labelTanggal = computed(() =>
  jenis.value === 'produksi' ? 'Tanggal produksi' : 'Tanggal transaksi',
)

const labelPihak = computed(() => {
  if (jenis.value === 'masuk') return 'Pemasok'
  if (jenis.value === 'retur') return 'Asal retur'
  if (jenis.value === 'ditolak') return 'Pembeli / asal'
  return 'Pembeli'
})

const labelKeterangan = computed(() =>
  butuhAlasan.value ? 'Alasan / keterangan' : 'Keterangan (opsional)',
)

const placeholderKeterangan = computed(() => {
  if (jenis.value === 'retur') return 'Contoh: kemasan rusak saat pengiriman'
  if (jenis.value === 'ditolak') return 'Contoh: barang ditolak pembeli, kemasan penyok'
  if (jenis.value === 'koreksi') return 'Contoh: selisih stock opname kurang 1 karung'
  return 'Catatan tambahan untuk nota ini'
})

const jumlahError = computed(() => Object.keys(errors).length)

function hargaMaster(produkId) {
  return produkById(produkId)?.hargaSatuan ?? ''
}

function bersihkanError() {
  Object.keys(errors).forEach((kunci) => delete errors[kunci])
}

function hapusError(kunci) {
  delete errors[kunci]
  pesanSistem.value = ''
}

function perbaruiNomor() {
  if (!nomorOtomatis.value) return
  form.nomorDokumen = nomorDokumenBerikut(jenis.value, form.tanggal)
}

function tanggalBerubah() {
  hapusError('tanggal')
  perbaruiNomor()
}

function nomorDiubah() {
  nomorOtomatis.value = false
  hapusError('nomorDokumen')
}

function produkBerubah() {
  hapusError('produk')
  hapusError('jumlah')
  hapusError('batchId')
  form.batchId = ''
  if (butuhHarga.value) {
    form.hargaSatuan = hargaMaster(form.produkId)
    hapusError('hargaSatuan')
  }
}

function kosongkanForm() {
  form.tanggal = gudang.hariIni
  form.pihak = ''
  form.produkId = 'tt50'
  form.jumlah = ''
  form.beratKg = ''
  form.keterangan = ''
  form.arah = 'kurang'
  form.batchId = ''
  form.hargaSatuan = hargaMaster('tt50')
  nomorOtomatis.value = true
  perbaruiNomor()
  bersihkanError()
  pesanSistem.value = ''
}

function pilihJenis(value) {
  if (value === jenis.value) {
    if (hasil.value) ulangi()
    return
  }
  jenis.value = value
  hasil.value = null
  kosongkanForm()
}

function validasi() {
  bersihkanError()

  if (!form.tanggal) {
    errors.tanggal = 'Tanggal wajib diisi.'
  } else if (form.tanggal > gudang.hariIni) {
    errors.tanggal = 'Tanggal tidak boleh melewati hari ini.'
  }

  const nomor = form.nomorDokumen.trim()
  if (!nomor) {
    errors.nomorDokumen = 'Nomor dokumen wajib diisi.'
  } else if (nomorDokumenDipakai(nomor)) {
    errors.nomorDokumen = 'Nomor dokumen sudah dipakai transaksi lain.'
  }

  if (butuhPihak.value && !form.pihak.trim()) {
    errors.pihak =
      jenis.value === 'masuk'
        ? 'Nama pemasok wajib diisi.'
        : 'Nama pembeli atau asal barang wajib diisi.'
  }

  if (butuhProduk.value && !produkTerpilih.value) {
    errors.produk = 'Pilih produk tepung.'
  }

  if (jenis.value === 'retur' && !batchReturTerpilih.value) {
    errors.batchId = 'Pilih batch asal barang retur.'
  }

  if (jenis.value === 'masuk') {
    const berat = Number(form.beratKg)
    if (!form.beratKg || Number.isNaN(berat) || berat <= 0) {
      errors.beratKg = 'Berat harus lebih dari 0 kg.'
    }
  } else {
    const jumlah = Number(form.jumlah)
    if (!form.jumlah || !Number.isInteger(jumlah) || jumlah <= 0) {
      errors.jumlah = 'Jumlah harus bilangan bulat lebih dari 0.'
    } else if (
      mengurangiStok.value &&
      beratHitung.value > stokSaatIni.value
    ) {
      errors.jumlah = `Stok tidak cukup. Tersedia ${formatKg(
        stokSaatIni.value,
      )}.`
    } else if (
      batchReturTerpilih.value &&
      beratHitung.value > batchReturTerpilih.value.bisaKg
    ) {
      errors.jumlah = `Retur melebihi barang yang keluar dari batch ini. Maksimal ${formatKg(
        batchReturTerpilih.value.bisaKg,
      )}.`
    }
  }

  if (butuhHarga.value) {
    const harga = Number(form.hargaSatuan)
    if (form.hargaSatuan === '' || Number.isNaN(harga) || harga < 0) {
      errors.hargaSatuan = 'Harga satuan wajib diisi dan tidak boleh negatif.'
    }
  }

  if (butuhAlasan.value && form.keterangan.trim().length < 4) {
    errors.keterangan = 'Alasan wajib diisi, minimal 4 karakter.'
  }

  const kunci = Object.keys(errors)
  if (kunci.length) {
    nextTick(() => {
      document.getElementById(`field-${kunci[0]}`)?.focus()
    })
  }
  return kunci.length === 0
}

async function kirim() {
  if (menyimpan.value) return
  pesanSistem.value = ''
  if (!validasi()) return

  const produk = butuhProduk.value ? produkTerpilih.value : null

  menyimpan.value = true
  try {
    const data = await simpanTransaksi({
      jenis: jenis.value,
      tanggal: form.tanggal,
      nomorDokumen: form.nomorDokumen,
      pihak:
        jenis.value === 'produksi'
          ? 'Gudang produksi'
          : jenis.value === 'koreksi'
            ? 'Stock opname'
            : form.pihak.trim(),
      produkId: produk ? produk.id : 'bahan-baku',
      jumlah:
        jenis.value === 'masuk' ? beratHitung.value : Number(form.jumlah),
      beratKg: beratHitung.value,
      hargaSatuan: Number(form.hargaSatuan),
      arah: form.arah,
      batchId: form.batchId,
      keterangan: form.keterangan,
    })

    hasil.value = {
      ...data,
      produk,
      jenis: jenis.value,
      arah: jenis.value === 'koreksi' ? form.arah : null,
    }
    riwayat.value.unshift({ ...data, produk })
    if (riwayat.value.length > 4) riwayat.value.length = 4

    kosongkanForm()
    nextTick(() => {
      document
        .getElementById('panel-transaksi')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  } catch (err) {
    pesanSistem.value = err.message
  } finally {
    menyimpan.value = false
  }
}

function ulangi() {
  hasil.value = null
  nextTick(() => {
    document
      .getElementById('panel-transaksi')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document
      .querySelector('#form-transaksi input, #form-transaksi select')
      ?.focus()
  })
}

function labelJenisSingkat(item) {
  return JENIS_BY_VALUE[item.transaksi.jenis]?.pendek || item.transaksi.jenis
}
</script>

<template>
  <div class="input-page">
    <AppTopbar :tanggal="hariIni" halaman="Catat informasi" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Catat informasi</h1>
          <p class="page-sub">
            Catat satu kejadian gudang. Stok dan dashboard diperbarui setelah
            transaksi disimpan.
          </p>
        </div>

        <div class="page-head__actions">
          <span class="date-pill">
            <IconApp nama="calendar" :ukuran="14" />
            {{ hariIni }}
          </span>
          <span class="admin-pill">
            <IconApp nama="receipt" :ukuran="13" />
            Admin Gudang
          </span>
        </div>
      </header>

      <div class="input-grid" :class="{ 'has-side': riwayat.length }">
        <div class="input-main">
          <section class="panel jenis-panel" aria-labelledby="jenis-judul">
            <div class="panel-head">
              <div>
                <h2 id="jenis-judul" class="panel-title">Jenis transaksi</h2>
                <p class="panel-sub">
                  Pilih salah satu dari enam jenis pencatatan gudang.
                </p>
              </div>
            </div>

            <div class="panel-body jenis-body">
              <div class="jenis-grid" role="tablist" aria-label="Jenis transaksi">
                <button
                  v-for="item in JENIS_TRANSAKSI"
                  :id="`tab-${item.value}`"
                  :key="item.value"
                  type="button"
                  role="tab"
                  class="jenis-tab"
                  :class="{ 'is-active': jenis === item.value }"
                  :aria-selected="jenis === item.value"
                  aria-controls="form-transaksi"
                  @click="pilihJenis(item.value)"
                >
                  <span class="jenis-tab__icon" aria-hidden="true">
                    <IconApp :nama="item.ikon" :ukuran="17" />
                  </span>
                  <span class="jenis-tab__text">
                    <strong>{{ item.pendek }}</strong>
                    <span>{{ item.ringkas }}</span>
                  </span>
                </button>
              </div>

              <p class="jenis-help">
                <IconApp nama="info" :ukuran="13" />
                {{ infoJenis.keterangan }}
              </p>
            </div>
          </section>

          <div id="panel-transaksi" class="panel-wrap">
            <TransaksiBerhasil
              v-if="hasil"
              :hasil="hasil"
              @lagi="ulangi"
            />

            <section
              v-else
              id="form-transaksi"
              class="panel form-panel"
              role="tabpanel"
              :aria-labelledby="`tab-${jenis}`"
            >
              <div class="panel-head form-head">
                <div>
                  <h2 id="form-judul" class="panel-title">
                    Formulir {{ infoJenis.label.toLowerCase() }}
                  </h2>
                  <p class="panel-sub">
                    Isian bertanda wajib harus lengkap sebelum disimpan.
                  </p>
                </div>
                <span class="doc-chip">{{ infoJenis.prefix }}</span>
              </div>

              <form class="form" novalidate @submit.prevent="kirim">
                <div v-if="pesanSistem" class="alert alert--danger" role="alert">
                  <IconApp nama="alert-triangle" :ukuran="15" />
                  <span>{{ pesanSistem }}</span>
                </div>
                <div
                  v-else-if="jumlahError"
                  class="alert alert--danger"
                  role="alert"
                  aria-live="polite"
                >
                  <IconApp nama="alert-circle" :ukuran="15" />
                  <span>
                    Ada {{ jumlahError }} isian yang perlu diperbaiki. Periksa
                    kembali kolom bertanda merah.
                  </span>
                </div>

                <div class="form-grid">
                  <div class="field" :class="{ 'is-error': errors.tanggal }">
                    <label for="field-tanggal">
                      {{ labelTanggal }}<span class="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="field-tanggal"
                      v-model="form.tanggal"
                      type="date"
                      :max="gudang.hariIni"
                      aria-required="true"
                      :aria-invalid="!!errors.tanggal"
                      @change="tanggalBerubah"
                    />
                    <p v-if="errors.tanggal" class="field__error">
                      {{ errors.tanggal }}
                    </p>
                  </div>

                  <div
                    class="field"
                    :class="{ 'is-error': errors.nomorDokumen }"
                  >
                    <label for="field-nomorDokumen">
                      Nomor dokumen<span class="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="field-nomorDokumen"
                      v-model="form.nomorDokumen"
                      type="text"
                      spellcheck="false"
                      autocomplete="off"
                      aria-required="true"
                      :aria-invalid="!!errors.nomorDokumen"
                      @input="nomorDiubah"
                    />
                    <p v-if="errors.nomorDokumen" class="field__error">
                      {{ errors.nomorDokumen }}
                    </p>
                    <p v-else class="field__hint">
                      Dibuat otomatis, bisa disesuaikan dengan nota asli.
                    </p>
                  </div>

                  <div
                    v-if="butuhPihak"
                    class="field"
                    :class="{ 'is-error': errors.pihak }"
                  >
                    <label for="field-pihak">
                      {{ labelPihak }}<span class="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="field-pihak"
                      v-model="form.pihak"
                      type="text"
                      autocomplete="off"
                      aria-required="true"
                      :list="jenis === 'masuk' ? 'daftar-pemasok' : 'daftar-pembeli'"
                      :aria-invalid="!!errors.pihak"
                      @input="hapusError('pihak')"
                    />
                    <datalist id="daftar-pemasok">
                      <option
                        v-for="nama in daftarPemasok"
                        :key="nama"
                        :value="nama"
                      />
                    </datalist>
                    <datalist id="daftar-pembeli">
                      <option
                        v-for="nama in daftarPembeli"
                        :key="nama"
                        :value="nama"
                      />
                    </datalist>
                    <p v-if="errors.pihak" class="field__error">
                      {{ errors.pihak }}
                    </p>
                  </div>

                  <div
                    v-if="butuhProduk"
                    class="field"
                    :class="{ 'is-error': errors.produk }"
                  >
                    <label for="field-produk">
                      Produk<span class="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="field-produk"
                      v-model="form.produkId"
                      aria-required="true"
                      :aria-invalid="!!errors.produk"
                      @change="produkBerubah"
                    >
                      <option
                        v-for="item in produkTepung"
                        :key="item.id"
                        :value="item.id"
                      >
                        {{ item.kemasan }} · {{ formatKg(item.beratPerSatuan) }}
                      </option>
                    </select>
                    <p v-if="errors.produk" class="field__error">
                      {{ errors.produk }}
                    </p>
                  </div>

                  <div
                    v-if="jenis === 'retur'"
                    class="field"
                    :class="{ 'is-error': errors.batchId }"
                  >
                    <label for="field-batchId">
                      Batch asal<span class="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="field-batchId"
                      v-model="form.batchId"
                      aria-required="true"
                      :aria-invalid="!!errors.batchId"
                      @change="hapusError('batchId'); hapusError('jumlah')"
                    >
                      <option value="" disabled>
                        {{ daftarBatchRetur.length ? 'Pilih batch yang pernah keluar' : 'Belum ada penjualan produk ini' }}
                      </option>
                      <option
                        v-for="item in daftarBatchRetur"
                        :key="item.batch.id"
                        :value="item.batch.id"
                      >
                        {{ item.batch.kode }} · produksi
                        {{ formatTanggal(item.batch.tanggalProduksi) }} · maks
                        {{ formatAngka(item.bisaKg / produkTerpilih.beratPerSatuan) }}
                        {{ satuanKemasan }}
                      </option>
                    </select>
                    <p v-if="errors.batchId" class="field__error">
                      {{ errors.batchId }}
                    </p>
                    <p v-else class="field__hint">
                      Umur stok retur mengikuti tanggal produksi batch ini.
                    </p>
                  </div>

                  <div
                    v-if="jenis === 'masuk'"
                    class="field"
                    :class="{ 'is-error': errors.beratKg }"
                  >
                    <label for="field-beratKg">
                      Berat bahan baku<span class="req" aria-hidden="true">*</span>
                    </label>
                    <div class="input-unit">
                      <input
                        id="field-beratKg"
                        v-model="form.beratKg"
                        type="number"
                        min="0.1"
                        step="0.1"
                        inputmode="decimal"
                        aria-required="true"
                        :aria-invalid="!!errors.beratKg"
                        @input="hapusError('beratKg')"
                      />
                      <span>kg</span>
                    </div>
                    <p v-if="errors.beratKg" class="field__error">
                      {{ errors.beratKg }}
                    </p>
                    <p v-else class="field__hint">
                      Berat nol atau negatif akan ditolak sistem.
                    </p>
                  </div>

                  <div
                    v-else
                    class="field"
                    :class="{ 'is-error': errors.jumlah }"
                  >
                    <label for="field-jumlah">
                      Jumlah<span class="req" aria-hidden="true">*</span>
                    </label>
                    <div class="input-unit">
                      <input
                        id="field-jumlah"
                        v-model="form.jumlah"
                        type="number"
                        min="1"
                        step="1"
                        inputmode="numeric"
                        aria-required="true"
                        :aria-invalid="!!errors.jumlah"
                        @input="hapusError('jumlah')"
                      />
                      <span>{{ satuanKemasan }}</span>
                    </div>
                    <p v-if="errors.jumlah" class="field__error">
                      {{ errors.jumlah }}
                    </p>
                    <p v-else class="field__hint">
                      = {{ formatKg(beratHitung) }} ·
                      {{ formatAngka(produkTerpilih?.beratPerSatuan || 0) }} kg
                      per {{ satuanKemasan }}
                    </p>
                  </div>

                  <div
                    v-if="butuhHarga"
                    class="field"
                    :class="{ 'is-error': errors.hargaSatuan }"
                  >
                    <label for="field-hargaSatuan">
                      Harga satuan<span class="req" aria-hidden="true">*</span>
                    </label>
                    <div class="input-unit input-unit--rp">
                      <span>Rp</span>
                      <input
                        id="field-hargaSatuan"
                        v-model="form.hargaSatuan"
                        type="number"
                        min="0"
                        step="1000"
                        inputmode="numeric"
                        aria-required="true"
                        :aria-invalid="!!errors.hargaSatuan"
                        @input="hapusError('hargaSatuan')"
                      />
                    </div>
                    <p v-if="errors.hargaSatuan" class="field__error">
                      {{ errors.hargaSatuan }}
                    </p>
                    <p v-else class="field__hint">
                      Harga master
                      {{ formatRupiah(produkTerpilih?.hargaSatuan || 0) }} per
                      {{ satuanKemasan }}, boleh diubah per nota.
                    </p>
                  </div>

                  <div v-if="butuhHarga" class="field">
                    <label>Nilai transaksi</label>
                    <output class="readout num">
                      {{ formatRupiah(nilaiHitung) }}
                    </output>
                    <p class="field__hint">Jumlah × harga satuan.</p>
                  </div>
                </div>

                <fieldset v-if="jenis === 'koreksi'" class="field arah">
                  <legend>Arah koreksi</legend>
                  <div class="arah__opsi">
                    <label class="radio">
                      <input
                        v-model="form.arah"
                        type="radio"
                        value="kurang"
                        @change="hapusError('jumlah')"
                      />
                      <span>Mengurangi stok</span>
                    </label>
                    <label class="radio">
                      <input
                        v-model="form.arah"
                        type="radio"
                        value="tambah"
                        @change="hapusError('jumlah')"
                      />
                      <span>Menambah stok</span>
                    </label>
                  </div>
                  <p class="field__hint">
                    Koreksi negatif memakai batch tertua (FIFO), koreksi positif
                    masuk ke batch terbaru.
                  </p>
                </fieldset>

                <div
                  class="field field--full"
                  :class="{ 'is-error': errors.keterangan }"
                >
                  <label for="field-keterangan">
                    {{ labelKeterangan
                    }}<span v-if="butuhAlasan" class="req" aria-hidden="true"
                      >*</span
                    >
                  </label>
                  <textarea
                    id="field-keterangan"
                    v-model="form.keterangan"
                    rows="3"
                    :placeholder="placeholderKeterangan"
                    :aria-required="butuhAlasan"
                    :aria-invalid="!!errors.keterangan"
                    @input="hapusError('keterangan')"
                  />
                  <p v-if="errors.keterangan" class="field__error">
                    {{ errors.keterangan }}
                  </p>
                  <p v-else-if="butuhAlasan" class="field__hint">
                    Wajib diisi untuk retur, barang ditolak, dan koreksi stok.
                  </p>
                </div>

                <div
                  v-if="jenis !== 'masuk'"
                  class="dampak"
                  :class="{ 'is-negative': mengurangiStok }"
                >
                  <div class="dampak__item">
                    <span>Stok tersedia</span>
                    <strong class="num">{{ formatKg(stokSaatIni) }}</strong>
                  </div>
                  <IconApp nama="arrow-right" :ukuran="16" class="dampak__arrow" />
                  <div class="dampak__item">
                    <span>Setelah disimpan</span>
                    <strong class="num">{{ formatKg(stokSetelah) }}</strong>
                  </div>
                  <span
                    class="dampak__badge"
                    :class="mengurangiStok ? 'is-out' : 'is-in'"
                  >
                    {{ mengurangiStok ? '−' : '+' }}{{ formatKg(beratHitung) }}
                  </span>
                </div>

                <div v-if="batchInfo" class="batch-info">
                  <span class="batch-info__icon" aria-hidden="true">
                    <IconApp nama="layers" :ukuran="15" />
                  </span>
                  <div class="batch-info__text">
                    <strong>{{ batchInfo.kode }}</strong>
                    <span>
                      {{
                        batchInfo.baru
                          ? 'Batch baru akan dibuat untuk tanggal ini.'
                          : 'Stok produksi digabung ke batch yang sudah ada.'
                      }}
                    </span>
                  </div>
                </div>

                <FifoPreview
                  v-if="fifo"
                  :alokasi="fifo.alokasi"
                  :kekurangan-kg="kekuranganKg"
                  :stok-setelah="stokSetelah"
                />

                <div class="form-actions">
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="kosongkanForm"
                  >
                    Bersihkan
                  </button>
                  <button
                    type="submit"
                    class="btn btn--primary"
                    :disabled="menyimpan"
                  >
                    <IconApp nama="check" :ukuran="15" />
                    Simpan transaksi
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <aside v-if="riwayat.length" class="input-side" aria-label="Riwayat input sesi ini">
          <section class="panel" aria-labelledby="riwayat-judul">
            <div class="panel-head">
              <div>
                <h2 id="riwayat-judul" class="panel-title">Sesi ini</h2>
                <p class="panel-sub">Transaksi yang baru Anda simpan</p>
              </div>
            </div>
            <div class="panel-body riwayat-body">
              <ul class="log">
                <li
                  v-for="item in riwayat"
                  :key="item.transaksi.id"
                  class="log__item"
                >
                  <span
                    class="log__icon"
                    :class="`is-${item.transaksi.jenis}`"
                    aria-hidden="true"
                  >
                    <IconApp
                      :nama="JENIS_BY_VALUE[item.transaksi.jenis].ikon"
                      :ukuran="14"
                    />
                  </span>
                  <div class="log__main">
                    <strong>{{ item.transaksi.nomorDokumen }}</strong>
                    <span>
                      {{ labelJenisSingkat(item) }} ·
                      {{ item.produk ? item.produk.kemasan : 'Bahan baku' }}
                    </span>
                  </div>
                  <span class="log__value num">
                    {{ formatKg(item.transaksi.beratKg) }}
                  </span>
                </li>
              </ul>
              <p class="log__note">
                Daftar ini hanya untuk sesi ini; transaksinya tetap tersimpan di
                basis data.
              </p>
            </div>
          </section>

        </aside>
      </div>

      <footer class="page-foot">
        <span>
          Dashboard Monitoring Stok dan Transaksi Tepung Tapioka · CV Tani
          Sadulur
        </span>
        <span>Data contoh · Prototipe capstone</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.input-page {
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

.date-pill,
.admin-pill {
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 11px;
  white-space: nowrap;
}

.date-pill {
  color: var(--text-secondary);
  font-weight: 650;
}

.admin-pill {
  color: var(--muted);
}

.input-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.input-grid.has-side {
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
}

.input-main,
.input-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

/* ---------- Jenis transaksi ---------- */
.jenis-body {
  padding-top: 14px;
}

.jenis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.jenis-tab {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease,
    box-shadow 0.15s ease;
}

.jenis-tab:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
}

.jenis-tab.is-active {
  border-color: var(--brand-600);
  background: var(--brand-50);
  box-shadow: inset 0 0 0 1px var(--brand-600);
}

.jenis-tab__icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.jenis-tab.is-active .jenis-tab__icon {
  background: var(--brand-100);
  color: var(--brand-700);
}

.jenis-tab__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.3;
}

.jenis-tab__text strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jenis-tab__text span {
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jenis-help {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 11px;
  margin-top: 12px;
  border-top: 1px dashed var(--border);
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.5;
}

/* ---------- Form ---------- */
.panel-wrap {
  scroll-margin-top: 84px;
}

.form-head {
  flex-wrap: wrap;
  row-gap: 10px;
}

.doc-chip {
  flex: none;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.form {
  padding: 18px 20px 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.field--full {
  grid-column: 1 / -1;
  margin-top: 14px;
}

.field label,
.field legend {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.req {
  margin-left: 3px;
  color: var(--danger);
  font-weight: 750;
}

.field input[type='text'],
.field input[type='number'],
.field input[type='date'],
.field select,
.field textarea {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field textarea {
  height: auto;
  min-height: 78px;
  padding: 9px 11px;
  line-height: 1.5;
  resize: vertical;
}

.field select {
  appearance: none;
  padding-right: 30px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7a70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-position: right 10px center;
  background-repeat: no-repeat;
}

.field input:focus-visible,
.field select:focus-visible,
.field textarea:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.field.is-error input,
.field.is-error select,
.field.is-error textarea {
  border-color: var(--danger);
  background: var(--danger-soft);
}

.field__hint {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.field__error {
  color: var(--danger);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
}

.input-unit {
  display: flex;
  align-items: stretch;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
}

.input-unit:focus-within {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.input-unit input {
  height: 100%;
  flex: 1;
  min-width: 0;
  border: 0 !important;
  background: transparent !important;
}

.input-unit span {
  display: inline-flex;
  flex: none;
  align-items: center;
  padding: 0 11px;
  border-left: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 600;
}

.input-unit--rp span {
  border-right: 1px solid var(--border);
  border-left: 0;
}

.field.is-error .input-unit {
  border-color: var(--danger);
  background: var(--danger-soft);
}

.readout {
  display: flex;
  height: 40px;
  align-items: center;
  padding: 0 11px;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.arah {
  padding: 0;
  margin: 14px 0 0;
  border: 0;
}

.arah__opsi {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.radio {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.radio:has(input:checked) {
  border-color: var(--brand-600);
  background: var(--brand-50);
  color: var(--brand-800);
}

.radio input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--brand-600);
}

.dampak {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 11px 13px;
  margin-top: 15px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
}

.dampak__item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dampak__item span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dampak__item strong {
  color: var(--text);
  font-size: 12.5px;
  font-weight: 750;
}

.dampak__arrow {
  color: var(--muted);
}

.dampak__badge {
  padding: 3px 8px;
  margin-left: auto;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
}

.dampak__badge.is-in {
  background: var(--positive-soft);
  color: var(--positive);
}

.dampak__badge.is-out {
  background: var(--gold-50);
  color: var(--gold-600);
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
}

.batch-info__icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border-radius: 7px;
  background: #eaf3f3;
  color: #2a6d6c;
}

.batch-info__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.batch-info__text strong {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.batch-info__text span {
  color: var(--muted);
  font-size: 9.5px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 15px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 15px;
  border-radius: 9px;
  font-size: 11.5px;
  font-weight: 650;
  transition: background 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}

.btn--primary {
  background: var(--brand-800);
  color: #fff;
}

.btn--primary:hover {
  background: var(--brand-900);
}

.btn--ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn--ghost:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px solid var(--danger-border);
  border-radius: 9px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 10.5px;
  line-height: 1.5;
}

/* ---------- Panel samping ---------- */
.riwayat-body {
  padding-top: 10px;
}

.log {
  display: flex;
  flex-direction: column;
}

.log__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  border-bottom: 1px solid #eef1ea;
}

.log__item:last-child {
  border-bottom: 0;
}

.log__icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border-radius: 7px;
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.log__icon.is-masuk {
  background: var(--positive-soft);
  color: var(--positive);
}

.log__icon.is-produksi {
  background: #eaf3f3;
  color: #2a6d6c;
}

.log__icon.is-keluar {
  background: var(--gold-50);
  color: var(--gold-600);
}

.log__icon.is-retur {
  background: var(--clay-soft);
  color: var(--clay);
}

.log__icon.is-ditolak {
  background: var(--danger-soft);
  color: var(--danger);
}

.log__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.log__main strong {
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log__main span {
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log__value {
  flex: none;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
}

.log__note {
  padding-top: 10px;
  margin-top: 2px;
  border-top: 1px dashed var(--border);
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
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
  letter-spacing: 0.01em;
}

@media (min-width: 1121px) {
  .input-side {
    position: sticky;
    top: 84px;
  }
}

@media (max-width: 1120px) {
  .input-grid.has-side {
    grid-template-columns: minmax(0, 1fr);
  }

  .input-side {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

@media (max-width: 1024px) {
  .content {
    padding: 22px 20px 30px;
  }
}

@media (max-width: 760px) {
  .jenis-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .input-side {
    display: flex;
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

  .admin-pill {
    display: none;
  }

  .form {
    padding: 16px;
  }

  .jenis-tab {
    padding: 8px;
  }

  .form-actions .btn {
    flex: 1;
  }

  .page-foot {
    font-size: 9px;
  }
}
</style>
