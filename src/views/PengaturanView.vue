<script setup>
import { computed, reactive, ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import {
  gudang,
  perbaruiHargaProduk,
  perbaruiPengaturan,
  resetDataDemo,
} from '../stores/gudang'
import {
  formatHari,
  formatRupiah,
  formatTanggal,
} from '../utils/format'

const hariIniLabel = formatHari(gudang.hariIni)

const batas = reactive({
  peringatanBulan: gudang.pengaturan.peringatanBulan,
  maksimalBulan: gudang.pengaturan.maksimalBulan,
})

const harga = reactive(
  Object.fromEntries(gudang.produk.map((item) => [item.id, item.hargaSatuan])),
)

const pesanBatas = ref('')
const errorBatas = ref('')
const pesanHarga = ref('')
const errorHarga = ref('')
const pesanReset = ref('')
const errorReset = ref('')
const konfirmasiReset = ref(false)

const produkTepung = computed(() =>
  gudang.produk.filter((item) => item.jenis === 'tepung'),
)

const batasBerubah = computed(
  () =>
    Number(batas.peringatanBulan) !== gudang.pengaturan.peringatanBulan ||
    Number(batas.maksimalBulan) !== gudang.pengaturan.maksimalBulan,
)

const hargaBerubah = computed(() =>
  gudang.produk.some(
    (item) => Number(harga[item.id]) !== Number(item.hargaSatuan),
  ),
)

const batasValid = computed(() => {
  const peringatan = Number(batas.peringatanBulan)
  const maksimal = Number(batas.maksimalBulan)
  return (
    Number.isFinite(peringatan) &&
    Number.isFinite(maksimal) &&
    peringatan > 0 &&
    maksimal > 0 &&
    peringatan < maksimal
  )
})

const hargaValid = computed(() =>
  gudang.produk.every((item) => {
    const nilai = Number(harga[item.id])
    if (!Number.isFinite(nilai) || nilai < 0) return false
    if (item.jenis === 'tepung' && nilai <= 0) return false
    return true
  }),
)

const previewStatus = computed(() => [
  {
    label: 'Aman',
    aturan: `Umur < ${batas.peringatanBulan || 0} bulan`,
    tone: 'aman',
  },
  {
    label: 'Waspada',
    aturan: `${batas.peringatanBulan || 0}–${batas.maksimalBulan || 0} bulan`,
    tone: 'waspada',
  },
  {
    label: 'Lewat batas',
    aturan: `Umur > ${batas.maksimalBulan || 0} bulan`,
    tone: 'lewat',
  },
])

function hargaPerKg(item) {
  const nilai = Number(harga[item.id]) || 0
  return item.beratPerSatuan ? nilai / item.beratPerSatuan : 0
}

async function simpanBatas() {
  errorBatas.value = ''
  pesanBatas.value = ''

  if (!batasValid.value) {
    errorBatas.value =
      'Batas peringatan dan maksimal harus lebih dari nol, dan batas peringatan harus lebih kecil.'
    return
  }

  try {
    await perbaruiPengaturan({
      peringatanBulan: batas.peringatanBulan,
      maksimalBulan: batas.maksimalBulan,
    })
    batas.peringatanBulan = gudang.pengaturan.peringatanBulan
    batas.maksimalBulan = gudang.pengaturan.maksimalBulan
    pesanBatas.value = 'Batas umur batch berhasil disimpan.'
  } catch (error) {
    errorBatas.value = error.message
  }
}

async function simpanHarga() {
  errorHarga.value = ''
  pesanHarga.value = ''

  if (!hargaValid.value) {
    errorHarga.value =
      'Harga tepung harus lebih dari nol dan harga lainnya tidak boleh negatif.'
    return
  }

  try {
    for (const item of gudang.produk) {
      await perbaruiHargaProduk(item.id, Number(harga[item.id]))
      harga[item.id] = item.hargaSatuan
    }
    pesanHarga.value = 'Harga master produk berhasil disimpan.'
  } catch (error) {
    errorHarga.value = error.message
  }
}

function bukaKonfirmasiReset() {
  pesanReset.value = ''
  konfirmasiReset.value = true
}

function batalReset() {
  konfirmasiReset.value = false
}

async function lakukanReset() {
  errorReset.value = ''
  try {
    await resetDataDemo()
  } catch (error) {
    errorReset.value = error.message
    konfirmasiReset.value = false
    return
  }

  batas.peringatanBulan = gudang.pengaturan.peringatanBulan
  batas.maksimalBulan = gudang.pengaturan.maksimalBulan
  Object.keys(harga).forEach((kunci) => delete harga[kunci])
  gudang.produk.forEach((item) => {
    harga[item.id] = item.hargaSatuan
  })

  errorBatas.value = ''
  errorHarga.value = ''
  pesanBatas.value = ''
  pesanHarga.value = ''
  konfirmasiReset.value = false
  pesanReset.value =
    'Data contoh berhasil dikembalikan ke kondisi awal. Transaksi yang dicatat sebelumnya dihapus.'
}
</script>

<template>
  <div class="pengaturan-page">
    <AppTopbar :tanggal="hariIniLabel" halaman="Pengaturan" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Pengaturan</h1>
          <p class="page-sub">
            Atur batas umur batch, harga master produk, dan data contoh
            prototipe.
          </p>
        </div>

        <div class="page-head__actions">
          <span class="date-pill">
            <IconApp nama="calendar" :ukuran="14" />
            {{ formatTanggal(gudang.hariIni) }}
          </span>
        </div>
      </header>

      <section class="settings-grid">
        <div class="panel settings-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">
                <span class="panel-icon">
                  <IconApp nama="clock" :ukuran="15" />
                </span>
                Batas umur batch
              </h2>
              <p class="panel-sub">
                Dipakai untuk menentukan status Aman, Waspada, dan Lewat batas.
              </p>
            </div>
          </div>

          <div class="panel-body">
            <div class="field-grid">
              <label class="field">
                <span>Batas peringatan</span>
                <div class="input-suffix">
                  <input
                    v-model.number="batas.peringatanBulan"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    @input="pesanBatas = ''; errorBatas = ''"
                  />
                  <span>bulan</span>
                </div>
                <small>Batas awal untuk memprioritaskan batch keluar.</small>
              </label>

              <label class="field">
                <span>Batas maksimal mutu</span>
                <div class="input-suffix">
                  <input
                    v-model.number="batas.maksimalBulan"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    @input="pesanBatas = ''; errorBatas = ''"
                  />
                  <span>bulan</span>
                </div>
                <small>Batas akhir umur produk yang masih layak.</small>
              </label>
            </div>

            <div class="status-preview" aria-label="Pratinjau status umur batch">
              <div
                v-for="item in previewStatus"
                :key="item.tone"
                class="preview-item"
              >
                <span
                  class="preview-dot"
                  :class="`is-${item.tone}`"
                  aria-hidden="true"
                />
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.aturan }}</span>
                </div>
              </div>
            </div>

            <div v-if="errorBatas" class="message is-error" role="alert">
              <IconApp nama="alert-circle" :ukuran="14" />
              {{ errorBatas }}
            </div>
            <div v-else-if="pesanBatas" class="message is-success" role="status">
              <IconApp nama="check" :ukuran="14" />
              {{ pesanBatas }}
            </div>

            <div class="form-foot">
              <span class="form-hint">
                <IconApp nama="info" :ukuran="12" />
                Perubahan langsung dipakai dashboard dan daftar batch.
              </span>
              <button
                type="button"
                class="save-btn"
                :disabled="!batasBerubah"
                @click="simpanBatas"
              >
                <IconApp nama="check" :ukuran="14" />
                Simpan batas
              </button>
            </div>
          </div>
        </div>

      </section>

      <section class="panel harga-panel" aria-labelledby="harga-judul">
        <div class="panel-head harga-head">
          <div>
            <h2 id="harga-judul" class="panel-title">
              <span class="panel-icon is-gold">
                <IconApp nama="wallet" :ukuran="15" />
              </span>
              Master produk &amp; harga
            </h2>
            <p class="panel-sub">
              Harga satuan dipakai untuk menghitung nilai transaksi dan nilai
              stok.
            </p>
          </div>
          <span class="product-count">{{ gudang.produk.length }} produk</span>
        </div>

        <div class="panel-body">
          <div class="table-wrap">
            <table class="harga-table">
              <caption class="sr-only">
                Daftar produk, berat per satuan, harga satuan, dan harga per
                kilogram.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  <th scope="col" class="col-berat">Berat / satuan</th>
                  <th scope="col" class="col-harga">Harga satuan</th>
                  <th scope="col" class="col-perkg">Harga per kg</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in gudang.produk" :key="item.id">
                  <td data-label="Produk">
                    <div class="produk-cell">
                      <span class="produk-icon" :class="{ 'is-bahan': item.jenis !== 'tepung' }">
                        <IconApp
                          :nama="item.jenis === 'tepung' ? 'package' : 'wheat'"
                          :ukuran="14"
                        />
                      </span>
                      <div>
                        <strong>{{ item.kemasan }}</strong>
                        <span>{{ item.nama }}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Berat / satuan" class="num">
                    {{
                      item.beratPerSatuan
                        ? `${item.beratPerSatuan} kg`
                        : 'per kg'
                    }}
                  </td>
                  <td data-label="Harga satuan">
                    <div v-if="item.jenis === 'tepung'" class="harga-input">
                      <span>Rp</span>
                      <input
                        v-model.number="harga[item.id]"
                        type="number"
                        min="1"
                        step="1000"
                        inputmode="numeric"
                        :aria-label="`Harga satuan ${item.kemasan}`"
                        @input="pesanHarga = ''; errorHarga = ''"
                      />
                    </div>
                    <span v-else class="muted-cell">Tidak dinilai</span>
                  </td>
                  <td data-label="Harga per kg" class="num cell-perkg">
                    {{ formatRupiah(hargaPerKg(item)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="errorHarga" class="message is-error" role="alert">
            <IconApp nama="alert-circle" :ukuran="14" />
            {{ errorHarga }}
          </div>
          <div v-else-if="pesanHarga" class="message is-success" role="status">
            <IconApp nama="check" :ukuran="14" />
            {{ pesanHarga }}
          </div>

          <div class="form-foot">
            <span class="form-hint">
              <IconApp nama="info" :ukuran="12" />
              Harga baru berlaku untuk perhitungan nilai stok dan transaksi
              berikutnya.
            </span>
            <button
              type="button"
              class="save-btn"
              :disabled="!hargaBerubah"
              @click="simpanHarga"
            >
              <IconApp nama="check" :ukuran="14" />
              Simpan harga
            </button>
          </div>
        </div>
      </section>

      <section class="panel reset-panel" aria-labelledby="reset-judul">
        <div class="reset-copy">
          <span class="reset-icon">
            <IconApp nama="undo" :ukuran="18" />
          </span>
          <div>
            <h2 id="reset-judul">Reset data contoh</h2>
            <p>
              Kembalikan produk, batch, transaksi, dan pengaturan ke kondisi
              awal prototipe. Semua transaksi yang sudah dicatat di server akan
              dihapus.
            </p>
          </div>
        </div>

        <div class="reset-action">
          <div v-if="errorReset" class="message is-error" role="alert">
            <IconApp nama="alert-circle" :ukuran="14" />
            {{ errorReset }}
          </div>
          <div v-if="pesanReset" class="message is-success" role="status">
            <IconApp nama="check" :ukuran="14" />
            {{ pesanReset }}
          </div>

          <template v-if="!konfirmasiReset">
            <button type="button" class="reset-data-btn" @click="bukaKonfirmasiReset">
              <IconApp nama="undo" :ukuran="14" />
              Reset data contoh
            </button>
          </template>

          <div v-else class="confirm-box" role="alertdialog" aria-labelledby="konfirmasi-reset">
            <strong id="konfirmasi-reset">Reset semua data contoh?</strong>
            <div>
              <button type="button" class="confirm-btn is-danger" @click="lakukanReset">
                Ya, reset
              </button>
              <button type="button" class="confirm-btn" @click="batalReset">
                Batal
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer class="page-foot">
        <span>
          Pengaturan ini memengaruhi perhitungan di seluruh halaman prototipe.
        </span>
        <span>Data contoh · Prototipe capstone</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.pengaturan-page {
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
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.settings-panel .panel-body {
  padding-top: 16px;
}

.panel-icon {
  display: inline-grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 7px;
  background: var(--brand-50);
  color: var(--brand-700);
}

.panel-icon.is-gold {
  background: var(--gold-50);
  color: var(--gold-600);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.field > span {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 650;
}

.field small {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.input-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-suffix input {
  width: 100%;
  height: 38px;
  padding: 0 54px 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
  font-weight: 650;
}

.input-suffix span {
  position: absolute;
  right: 10px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}

.input-suffix input:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.status-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 11px;
  margin-top: 13px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-soft);
}

.preview-item {
  display: flex;
  min-width: 130px;
  flex: 1;
  align-items: flex-start;
  gap: 7px;
}

.preview-dot {
  width: 7px;
  height: 7px;
  flex: none;
  margin-top: 4px;
  border-radius: 50%;
}

.preview-dot.is-aman {
  background: var(--positive);
}

.preview-dot.is-waspada {
  background: var(--gold-500);
}

.preview-dot.is-lewat {
  background: var(--danger);
}

.preview-item div {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.preview-item strong {
  color: var(--text);
  font-size: 10px;
  font-weight: 700;
}

.preview-item span {
  color: var(--muted);
  font-size: 9px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  margin-top: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 10px;
  line-height: 1.5;
}

.message.is-error {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.message.is-success {
  border-color: var(--positive-border);
  background: var(--positive-soft);
  color: var(--positive);
}

.form-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
}

.form-hint {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  max-width: 340px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.form-hint :deep(.icon) {
  margin-top: 1px;
}

.save-btn {
  display: inline-flex;
  height: 34px;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--brand-800);
  color: #fff;
  font-size: 11px;
  font-weight: 650;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.save-btn:hover:not(:disabled) {
  background: var(--brand-900);
}

.save-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.harga-panel {
  margin-bottom: 14px;
}

.harga-head {
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.product-count {
  flex: none;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.harga-panel .panel-body {
  padding-top: 0;
}

.table-wrap {
  overflow-x: auto;
}

.harga-table {
  min-width: 640px;
}

.harga-table th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
}

.harga-table th:first-child,
.harga-table td:first-child {
  padding-left: 2px;
}

.harga-table th:last-child,
.harga-table td:last-child {
  padding-right: 2px;
}

.harga-table th:nth-child(1) {
  width: 36%;
}

.harga-table th:nth-child(2) {
  width: 18%;
}

.harga-table th:nth-child(3) {
  width: 28%;
}

.harga-table th:nth-child(4) {
  width: 18%;
  text-align: right;
}

.harga-table td {
  padding: 11px 8px;
  border-bottom: 1px solid #eef1ea;
  color: var(--text-secondary);
  font-size: 11px;
  vertical-align: middle;
}

.harga-table tbody tr:last-child td {
  border-bottom: 0;
}

.produk-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.produk-icon {
  display: grid;
  width: 29px;
  height: 29px;
  flex: none;
  place-items: center;
  border-radius: 7px;
  background: var(--brand-50);
  color: var(--brand-600);
}

.produk-icon.is-bahan {
  background: var(--gold-50);
  color: var(--gold-600);
}

.produk-cell div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.35;
}

.produk-cell strong {
  color: var(--text);
  font-size: 11.5px;
  font-weight: 650;
}

.produk-cell span {
  color: var(--muted);
  font-size: 9.5px;
}

.harga-input {
  display: flex;
  align-items: center;
  max-width: 170px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  overflow: hidden;
}

.harga-input:focus-within {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.harga-input span {
  padding-left: 9px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.harga-input input {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0 8px;
  border: 0;
  background: transparent;
  font-size: 11.5px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.harga-input input:focus-visible {
  outline: none;
}

.muted-cell {
  color: var(--muted);
  font-size: 10px;
}

.cell-perkg {
  color: var(--text);
  font-weight: 650;
  text-align: right;
  white-space: nowrap;
}

.reset-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
}

.reset-copy {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 10px;
}

.reset-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 9px;
  background: var(--danger-soft);
  color: var(--danger);
}

.reset-copy h2 {
  font-size: 12.5px;
  font-weight: 700;
}

.reset-copy p {
  max-width: 620px;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.5;
}

.reset-action {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
}

.reset-action .message {
  max-width: 280px;
  margin-top: 0;
}

.reset-data-btn {
  display: inline-flex;
  height: 34px;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--danger);
  font-size: 10.5px;
  font-weight: 650;
}

.reset-data-btn:hover {
  background: var(--danger-soft);
}

.confirm-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid var(--danger-border);
  border-radius: 9px;
  background: var(--danger-soft);
}

.confirm-box strong {
  color: var(--danger);
  font-size: 10.5px;
  font-weight: 700;
}

.confirm-box div {
  display: flex;
  gap: 6px;
}

.confirm-btn {
  height: 27px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 650;
}

.confirm-btn.is-danger {
  border-color: var(--danger);
  background: var(--danger);
  color: #fff;
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

  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
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

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .reset-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .reset-action {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .reset-action .message {
    max-width: none;
  }

  .reset-data-btn {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .content {
    padding: 18px 16px 26px;
  }

  .page-sub {
    font-size: 12px;
  }

  .harga-table,
  .harga-table tbody,
  .harga-table tr,
  .harga-table td {
    display: block;
    width: 100%;
  }

  .harga-table {
    min-width: 0;
  }

  .harga-table thead {
    display: none;
  }

  .harga-table tbody {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .harga-table tbody tr {
    padding: 11px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .harga-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 4px 0;
    border: 0;
    text-align: left;
  }

  .harga-table td::before {
    color: var(--muted);
    content: attr(data-label);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .harga-table td:first-child {
    padding: 0 0 8px;
    margin-bottom: 3px;
    border-bottom: 1px dashed var(--border);
  }

  .harga-table td:first-child::before {
    display: none;
  }

  .harga-table td[data-label='Harga satuan'] {
    align-items: flex-start;
  }

  .harga-input {
    width: 170px;
  }

  .cell-perkg {
    text-align: right;
  }

  .reset-panel {
    padding: 16px;
  }

  .page-foot {
    font-size: 9px;
  }
}
</style>
