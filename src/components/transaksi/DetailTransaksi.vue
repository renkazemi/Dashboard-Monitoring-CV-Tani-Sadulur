<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import IconApp from '../IconApp.vue'
import JenisBadge from './JenisBadge.vue'
import StatusBadge from '../StatusBadge.vue'
import { JENIS_BY_VALUE } from '../../data/jenisTransaksi'
import { gudang } from '../../stores/gudang'
import { isAdmin } from '../../stores/auth'
import {
  hitungUmurBulan,
  hitungUmurHari,
  tentukanStatusUmur,
} from '../../utils/inventory'
import {
  formatAngka,
  formatKg,
  formatRupiah,
  formatTanggal,
  formatUmur,
} from '../../utils/format'

const props = defineProps({
  transaksi: { type: Object, required: true },
})

const emit = defineEmits(['tutup'])

const drawerEl = ref(null)
const tombolTutup = ref(null)
let pemicuFokus = null
let overflowSebelumnya = ''

const hariIni = new Date(`${gudang.hariIni}T12:00:00`)

const info = computed(
  () => props.transaksi.info || JENIS_BY_VALUE[props.transaksi.jenis],
)
const produk = computed(() => props.transaksi.produk)
const negatif = computed(() => Boolean(props.transaksi.negatif))
const beratAbs = computed(() =>
  Number(
    props.transaksi.beratAbs ?? Math.abs(Number(props.transaksi.beratKg) || 0),
  ),
)
const jumlahAbs = computed(() =>
  Math.abs(Number(props.transaksi.jumlah) || 0),
)

const tampilkanJumlah = computed(
  () =>
    props.transaksi.jenis !== 'masuk' &&
    props.transaksi.jumlah !== undefined &&
    props.transaksi.jumlah !== null,
)

const tampilkanNilai = computed(() => Number(props.transaksi.nilai) > 0)

const satuan = computed(() => {
  const kemasan = produk.value?.kemasan?.toLowerCase() || ''
  if (kemasan.startsWith('dus')) return 'dus'
  if (kemasan.startsWith('karung')) return 'karung'
  return 'kg'
})

const jumlahTeks = computed(() => {
  const tanda =
    props.transaksi.jenis === 'koreksi' && negatif.value ? '\u2212' : ''
  return `${tanda}${formatAngka(jumlahAbs.value)} ${satuan.value}`
})

const labelPihak = computed(() => {
  switch (props.transaksi.jenis) {
    case 'masuk':
      return 'Pemasok'
    case 'retur':
      return 'Asal retur'
    case 'ditolak':
      return 'Pembeli / asal'
    case 'produksi':
      return 'Sumber'
    case 'koreksi':
      return 'Sumber'
    default:
      return 'Pembeli'
  }
})

const dampakStok = computed(() => {
  const jenis = props.transaksi.jenis
  if (jenis === 'masuk') return 'Bahan baku diterima'
  if (jenis === 'produksi' || jenis === 'retur') {
    return 'Menambah stok tepung'
  }
  if (jenis === 'koreksi') {
    const kurang =
      props.transaksi.arah === 'kurang' ||
      Number(props.transaksi.beratKg) < 0
    return kurang ? 'Mengurangi stok tepung' : 'Menambah stok tepung'
  }
  return 'Mengurangi stok tepung'
})

const butuhAlokasi = computed(() =>
  ['keluar', 'ditolak', 'retur', 'koreksi'].includes(props.transaksi.jenis),
)

const alokasi = computed(() =>
  Array.isArray(props.transaksi.alokasi) ? props.transaksi.alokasi : [],
)

const alokasiLengkap = computed(() =>
  alokasi.value.map((item) => {
    const umurHari = hitungUmurHari(item.tanggalProduksi, hariIni)
    return {
      ...item,
      umur: formatUmur(umurHari),
      status: tentukanStatusUmur(
        hitungUmurBulan(item.tanggalProduksi, hariIni),
        gudang.pengaturan,
      ),
    }
  }),
)

const catatanAlokasi = computed(
  () =>
    'Rincian batch tidak tersimpan pada data contoh ini. Transaksi baru yang mengubah stok tepung akan menampilkan alokasi FIFO di sini.',
)

const labelArah = computed(() =>
  props.transaksi.arah === 'tambah' ? 'Menambah stok' : 'Mengurangi stok',
)

function daftarFokus() {
  if (!drawerEl.value) return []
  return [...drawerEl.value.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.getClientRects().length > 0)
}

function tanganiTombol(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('tutup')
    return
  }

  if (event.key !== 'Tab') return

  const fokus = daftarFokus()
  if (!fokus.length) return

  const pertama = fokus[0]
  const terakhir = fokus[fokus.length - 1]

  if (event.shiftKey && document.activeElement === pertama) {
    event.preventDefault()
    terakhir.focus()
  } else if (!event.shiftKey && document.activeElement === terakhir) {
    event.preventDefault()
    pertama.focus()
  }
}

function tutup() {
  emit('tutup')
}

onMounted(() => {
  pemicuFokus = document.activeElement
  overflowSebelumnya = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', tanganiTombol)
  nextTick(() => tombolTutup.value?.focus())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', tanganiTombol)
  document.body.style.overflow = overflowSebelumnya
  if (pemicuFokus?.isConnected) {
    nextTick(() => pemicuFokus.focus())
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="detail-layer" @click.self="tutup">
      <aside
        ref="drawerEl"
        class="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-transaksi-judul"
        tabindex="-1"
      >
        <header class="detail__head">
          <div class="detail__top">
            <JenisBadge :jenis="transaksi.jenis" penuh />
            <button
              ref="tombolTutup"
              class="detail__close"
              type="button"
              aria-label="Tutup detail transaksi"
              @click="tutup"
            >
              <IconApp nama="x" :ukuran="17" />
            </button>
          </div>

          <p class="detail__kicker">Detail transaksi</p>
          <h2 id="detail-transaksi-judul">{{ transaksi.nomorDokumen }}</h2>
          <p class="detail__date">
            <IconApp nama="calendar" :ukuran="12" />
            {{ formatTanggal(transaksi.tanggal) }} · {{ transaksi.jam }} WIB
          </p>
        </header>

        <div class="detail__body">
          <div class="hero" :class="{ 'is-negatif': negatif }">
            <span class="hero__label">Berat tercatat</span>
            <strong class="hero__value">
              {{ negatif ? '\u2212' : '+' }}{{ formatKg(beratAbs) }}
            </strong>
            <span class="hero__dampak">
              <IconApp
                :nama="negatif ? 'arrow-down-left' : 'arrow-up-right'"
                :ukuran="12"
              />
              {{ dampakStok }}
            </span>
            <span v-if="tampilkanNilai" class="hero__nilai">
              Nilai transaksi {{ formatRupiah(transaksi.nilai) }}
            </span>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Jenis</dt>
              <dd>{{ info?.label || transaksi.jenis }}</dd>
            </div>
            <div>
              <dt>{{ labelPihak }}</dt>
              <dd>{{ transaksi.pihak }}</dd>
            </div>
            <div>
              <dt>Produk</dt>
              <dd>
                <template v-if="produk">
                  {{ produk.nama }} · {{ produk.kemasan }}
                </template>
                <template v-else>—</template>
              </dd>
            </div>
            <div v-if="tampilkanJumlah">
              <dt>Jumlah</dt>
              <dd class="num">{{ jumlahTeks }}</dd>
            </div>
            <div v-if="tampilkanNilai">
              <dt>Nilai</dt>
              <dd class="num">{{ formatRupiah(transaksi.nilai) }}</dd>
            </div>
            <div v-if="transaksi.jenis === 'koreksi'">
              <dt>Arah koreksi</dt>
              <dd>{{ labelArah }}</dd>
            </div>
            <div v-if="transaksi.keterangan && !info?.alasan" class="is-full">
              <dt>Keterangan</dt>
              <dd>{{ transaksi.keterangan }}</dd>
            </div>
          </dl>

          <div v-if="info?.alasan" class="alasan-box">
            <span class="alasan-box__label">
              <IconApp nama="info" :ukuran="12" />
              Alasan {{ (info.label || transaksi.jenis).toLowerCase() }}
            </span>
            <p>{{ transaksi.keterangan || 'Tidak ada alasan tercatat.' }}</p>
          </div>

          <section
            v-if="transaksi.batchKode"
            class="detail-section"
            aria-labelledby="batch-produksi-judul"
          >
            <div class="section-head">
              <h3 id="batch-produksi-judul">Batch hasil produksi</h3>
            </div>
            <div class="batch-line">
              <span class="batch-code">{{ transaksi.batchKode }}</span>
              <span v-if="transaksi.tanggalProduksi">
                Produksi {{ formatTanggal(transaksi.tanggalProduksi) }}
              </span>
            </div>
          </section>

          <section
            v-if="butuhAlokasi || alokasiLengkap.length"
            class="detail-section"
            aria-labelledby="alokasi-judul"
          >
            <div class="section-head">
              <h3 id="alokasi-judul">
                {{ transaksi.jenis === 'retur' ? 'Batch asal retur' : 'Alokasi batch' }}
              </h3>
              <span v-if="transaksi.jenis !== 'retur'" class="fifo-chip">FIFO</span>
            </div>

            <ul v-if="alokasiLengkap.length" class="alokasi">
              <li
                v-for="item in alokasiLengkap"
                :key="item.batchId"
                class="alokasi__item"
              >
                <span class="alokasi__kode">{{ item.kode }}</span>
                <span class="alokasi__berat num">
                  {{ formatKg(item.beratKg) }}
                </span>
                <span class="alokasi__meta">
                  Produksi {{ formatTanggal(item.tanggalProduksi) }} ·
                  {{ item.umur }}
                </span>
                <StatusBadge
                  class="alokasi__status"
                  :status="item.status"
                />
              </li>
            </ul>

            <p v-else class="alokasi-empty">
              <IconApp nama="info" :ukuran="14" />
              {{ catatanAlokasi }}
            </p>
          </section>

          <p class="detail__note">
            <IconApp nama="info" :ukuran="12" />
            Transaksi tidak dapat diubah. Kesalahan dicatat sebagai koreksi
            stok agar jejak audit tetap utuh.
          </p>
        </div>

        <footer class="detail__foot">
          <RouterLink
            v-if="isAdmin"
            to="/catat-informasi"
            class="btn btn--primary"
          >
            <IconApp nama="plus" :ukuran="14" />
            Catat transaksi baru
          </RouterLink>
          <button class="btn btn--ghost" type="button" @click="tutup">
            Tutup
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.detail-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  background: rgba(7, 24, 17, 0.46);
  backdrop-filter: blur(2px);
  animation: lapis-masuk 0.18s ease both;
}

.detail {
  display: flex;
  width: min(440px, 100vw);
  height: 100%;
  flex-direction: column;
  background: var(--surface);
  box-shadow: -24px 0 60px -32px rgba(7, 24, 17, 0.55);
  animation: panel-masuk 0.26s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.detail:focus {
  outline: none;
}

.detail__head {
  flex: none;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.detail__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.detail__close {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  transition: border-color 0.15s ease, color 0.15s ease,
    background 0.15s ease;
}

.detail__close:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.detail__kicker {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail__head h2 {
  margin-top: 3px;
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.detail__date {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
}

.detail__body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  padding: 18px 20px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 15px 16px;
  border: 1px solid var(--positive-border);
  border-radius: 12px;
  background: var(--positive-soft);
}

.hero.is-negatif {
  border-color: var(--danger-border);
  background: var(--danger-soft);
}

.hero__label {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.hero__value {
  color: var(--positive);
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.hero.is-negatif .hero__value {
  color: var(--danger);
}

.hero__dampak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.hero__nilai {
  padding-top: 7px;
  margin-top: 3px;
  border-top: 1px dashed rgba(18, 34, 25, 0.13);
  color: var(--text);
  font-size: 11px;
  font-weight: 650;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin: 0;
}

.detail-grid > .is-full {
  grid-column: 1 / -1;
}

.detail-grid dt {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-grid dd {
  margin: 3px 0 0;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.alasan-box {
  padding: 11px 13px;
  border: 1px solid var(--warning-border);
  border-radius: 9px;
  background: var(--warning-soft);
}

.alasan-box__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alasan-box p {
  margin-top: 4px;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.detail-section {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.section-head h3 {
  font-size: 12.5px;
  font-weight: 700;
}

.fifo-chip {
  padding: 2px 6px;
  border: 1px solid #dbe9e0;
  border-radius: 4px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 8.5px;
  font-weight: 750;
  letter-spacing: 0.05em;
}

.batch-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 10.5px;
}

.batch-code {
  display: inline-block;
  padding: 2px 6px;
  border: 1px solid #e2ece6;
  border-radius: 5px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 10.5px;
  font-weight: 750;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.alokasi {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alokasi__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-soft);
}

.alokasi__kode {
  color: var(--brand-700);
  font-size: 10.5px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.alokasi__berat {
  grid-row: 1 / 3;
  grid-column: 2;
  align-self: center;
  color: var(--text);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.alokasi__meta {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.alokasi__status {
  grid-column: 1 / -1;
  margin-top: 4px;
}

.alokasi-empty {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 11px;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}

.alokasi-empty :deep(.icon) {
  margin-top: 1px;
}

.detail__note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.detail__note :deep(.icon) {
  margin-top: 1px;
}

.detail__foot {
  display: flex;
  flex: none;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.btn {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 11.5px;
  font-weight: 650;
  transition: background 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}

.btn--primary {
  flex: 1;
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

@keyframes lapis-masuk {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes panel-masuk {
  from {
    transform: translateX(22px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .detail__head {
    padding: 16px;
  }

  .detail__body {
    padding: 16px;
  }

  .detail__foot {
    padding: 12px 16px;
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-grid > .is-full {
    grid-column: auto;
  }

  .hero__value {
    font-size: 24px;
  }
}
</style>
