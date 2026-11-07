<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import IconApp from '../IconApp.vue'
import StatusBadge from '../StatusBadge.vue'
import { useBatchStok } from '../../composables/useBatchStok'
import { isAdmin } from '../../stores/auth'
import { STATUS_UMUR } from '../../utils/inventory'
import {
  formatAngka,
  formatKg,
  formatRupiah,
  formatTanggal,
} from '../../utils/format'

const props = defineProps({
  batch: { type: Object, required: true },
})

const emit = defineEmits(['tutup'])

const drawerEl = ref(null)
const tombolTutup = ref(null)
let pemicuFokus = null
let overflowSebelumnya = ''

const { riwayatBatch } = useBatchStok()
const riwayat = computed(() => riwayatBatch(props.batch.id))
const statusInfo = computed(
  () => STATUS_UMUR[props.batch.statusTampil] || STATUS_UMUR.aman,
)

const satuanKemasan = computed(() => {
  const kemasan = props.batch.produk?.kemasan?.toLowerCase() || ''
  if (kemasan.startsWith('dus')) return 'dus'
  if (kemasan.startsWith('karung')) return 'karung'
  return 'kg'
})

const kemasanSisa = computed(() => {
  const berat = props.batch.produk?.beratPerSatuan || 0
  return berat ? Math.floor(props.batch.sisaKg / berat) : 0
})

const persenTerpakai = computed(() =>
  props.batch.totalMasukKg
    ? Math.min(100, (props.batch.terpakaiKg / props.batch.totalMasukKg) * 100)
    : 0,
)

function waktuMutasi(item) {
  if (!item.tanggal) return 'Data contoh'
  const jam = item.jam ? ` · ${item.jam} WIB` : ''
  return `${formatTanggal(item.tanggal)}${jam}`
}

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
    <div class="batch-layer" @click.self="tutup">
      <aside
        ref="drawerEl"
        class="batch-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-batch-judul"
        tabindex="-1"
      >
        <header class="batch-detail__head">
          <div class="batch-detail__top">
            <StatusBadge :status="batch.statusTampil" />
            <button
              ref="tombolTutup"
              class="close-btn"
              type="button"
              aria-label="Tutup detail batch"
              @click="tutup"
            >
              <IconApp nama="x" :ukuran="17" />
            </button>
          </div>

          <p class="batch-detail__kicker">Detail batch</p>
          <h2 id="detail-batch-judul">{{ batch.kode }}</h2>
          <p class="batch-detail__product">
            {{ batch.produk?.nama }} · {{ batch.produk?.kemasan }}
          </p>
          <p class="batch-detail__date">
            <IconApp nama="calendar" :ukuran="12" />
            Produksi {{ formatTanggal(batch.tanggalProduksi) }} ·
            {{ batch.umurLabel }}
          </p>
        </header>

        <div class="batch-detail__body">
          <div class="hero" :class="{ 'is-habis': batch.habis }">
            <span class="hero__label">
              {{ batch.habis ? 'Batch sudah habis' : 'Sisa stok batch' }}
            </span>
            <strong class="hero__value">{{ formatKg(batch.sisaKg) }}</strong>
            <span v-if="!batch.habis" class="hero__meta">
              {{ formatAngka(kemasanSisa) }} {{ satuanKemasan }} ·
              {{ formatRupiah(batch.nilaiStok) }}
            </span>
            <span v-else class="hero__meta">
              Seluruh hasil batch telah terpakai, tetap tersimpan untuk jejak
              produksi.
            </span>

            <div class="progress">
              <div class="progress__label">
                <span>Pemakaian batch</span>
                <span class="num">{{ Math.round(persenTerpakai) }}%</span>
              </div>
              <span
                class="progress__track"
                role="img"
                :aria-label="`${Math.round(
                  persenTerpakai,
                )} persen hasil batch sudah terpakai`"
              >
                <span
                  class="progress__fill"
                  :class="`is-${batch.statusTampil}`"
                  :style="{ width: `${persenTerpakai}%` }"
                />
              </span>
            </div>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Status</dt>
              <dd>{{ statusInfo.label }}</dd>
            </div>
            <div>
              <dt>Umur batch</dt>
              <dd class="num">{{ batch.umurLabel }} ({{ batch.umurHari }} hari)</dd>
            </div>
            <div>
              <dt>Total masuk</dt>
              <dd class="num">{{ formatKg(batch.totalMasukKg) }}</dd>
            </div>
            <div>
              <dt>Sudah terpakai</dt>
              <dd class="num">{{ formatKg(batch.terpakaiKg) }}</dd>
            </div>
            <div v-if="batch.penyesuaianKg">
              <dt>Penyesuaian</dt>
              <dd class="num">+{{ formatKg(batch.penyesuaianKg) }}</dd>
            </div>
            <div>
              <dt>Sisa stok</dt>
              <dd class="num">{{ formatKg(batch.sisaKg) }}</dd>
            </div>
            <div>
              <dt>Nilai stok</dt>
              <dd class="num">{{ formatRupiah(batch.nilaiStok) }}</dd>
            </div>
            <div>
              <dt>Harga per kg</dt>
              <dd class="num">{{ formatRupiah(batch.produk?.hargaPerKg) }}</dd>
            </div>
          </dl>

          <section class="mutasi-section" aria-labelledby="riwayat-mutasi-judul">
            <div class="section-head">
              <div>
                <h3 id="riwayat-mutasi-judul">Riwayat mutasi</h3>
                <p>Produksi, alokasi transaksi, dan penyesuaian batch.</p>
              </div>
              <span class="mutasi-count num">
                {{ formatAngka(riwayat.events.length) }}
              </span>
            </div>

            <ol v-if="riwayat.events.length" class="mutasi-list">
              <li
                v-for="item in riwayat.events"
                :key="item.key"
                class="mutasi"
                :class="{ 'is-agregat': item.agregat }"
              >
                <span
                  class="mutasi__icon"
                  :class="item.arah === 'masuk' ? 'is-masuk' : 'is-keluar'"
                >
                  <IconApp :nama="item.ikon" :ukuran="14" />
                </span>

                <div class="mutasi__main">
                  <div class="mutasi__title">
                    <strong>{{ item.judul }}</strong>
                    <span
                      class="mutasi__amount num"
                      :class="item.arah === 'masuk' ? 'is-masuk' : 'is-keluar'"
                    >
                      {{ item.arah === 'masuk' ? '+' : '−'
                      }}{{ formatKg(item.beratKg) }}
                    </span>
                  </div>

                  <div class="mutasi__meta">
                    <span>{{ waktuMutasi(item) }}</span>
                    <span v-if="item.kode" class="mutasi__doc">
                      {{ item.kode }}
                    </span>
                    <span v-else-if="item.pihak">{{ item.pihak }}</span>
                  </div>

                  <p v-if="item.keterangan" class="mutasi__note">
                    {{ item.keterangan }}
                  </p>

                  <span class="mutasi__saldo num">
                    Saldo {{ formatKg(item.saldoKg) }}
                  </span>
                </div>
              </li>
            </ol>

            <p v-else class="mutasi-empty">
              <IconApp nama="info" :ukuran="14" />
              Belum ada mutasi yang tercatat untuk batch ini.
            </p>

            <p v-if="riwayat.pemakaianGabunganKg" class="detail-note">
              <IconApp nama="info" :ukuran="12" />
              Sebagian pemakaian berasal dari data contoh yang tidak merinci
              nomor nota. Transaksi baru akan muncul sebagai mutasi per nota.
            </p>
          </section>

          <p class="detail-note">
            <IconApp nama="info" :ukuran="12" />
            Batch tidak dapat diubah atau dihapus. Koreksi stok dicatat sebagai
            transaksi baru agar jejak audit tetap utuh.
          </p>
        </div>

        <footer class="batch-detail__foot">
          <RouterLink
            v-if="isAdmin"
            to="/catat-informasi"
            class="btn btn--primary"
          >
            <IconApp nama="plus" :ukuran="14" />
            Catat transaksi
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
.batch-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  background: rgba(7, 24, 17, 0.46);
  backdrop-filter: blur(2px);
  animation: lapis-masuk 0.18s ease both;
}

.batch-detail {
  display: flex;
  width: min(470px, 100vw);
  height: 100%;
  flex-direction: column;
  background: var(--surface);
  box-shadow: -24px 0 60px -32px rgba(7, 24, 17, 0.55);
  animation: panel-masuk 0.26s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.batch-detail:focus {
  outline: none;
}

.batch-detail__head {
  flex: none;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.batch-detail__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.close-btn {
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

.close-btn:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.batch-detail__kicker {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.batch-detail__head h2 {
  margin-top: 3px;
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.batch-detail__product {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.batch-detail__date {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
}

.batch-detail__body {
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

.hero.is-habis {
  border-color: var(--border);
  background: var(--surface-soft);
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
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.hero.is-habis .hero__value {
  color: var(--muted);
}

.hero__meta {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.45;
}

.progress {
  padding-top: 9px;
  margin-top: 8px;
  border-top: 1px dashed rgba(18, 34, 25, 0.13);
}

.progress__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 600;
}

.progress__track {
  display: block;
  height: 5px;
  overflow: hidden;
  border-radius: 99px;
  background: #e7ede5;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--brand-500);
}

.progress__fill.is-waspada {
  background: var(--gold-500);
}

.progress__fill.is-lewat {
  background: #cf5a49;
}

.progress__fill.is-habis {
  background: #aeb8ac;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin: 0;
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

.mutasi-section {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-head h3 {
  font-size: 12.5px;
  font-weight: 700;
}

.section-head p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.mutasi-count {
  display: inline-grid;
  min-width: 24px;
  height: 22px;
  flex: none;
  place-items: center;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
}

.mutasi-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mutasi {
  position: relative;
  display: flex;
  gap: 10px;
  padding-bottom: 14px;
}

.mutasi::before {
  position: absolute;
  top: 28px;
  bottom: 0;
  left: 14px;
  width: 1px;
  background: var(--border);
  content: '';
}

.mutasi:last-child {
  padding-bottom: 0;
}

.mutasi:last-child::before {
  display: none;
}

.mutasi__icon {
  display: grid;
  width: 29px;
  height: 29px;
  flex: none;
  place-items: center;
  margin-top: 1px;
  border: 1px solid var(--positive-border);
  border-radius: 8px;
  background: var(--positive-soft);
  color: var(--positive);
}

.mutasi__icon.is-keluar {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.mutasi.is-agregat .mutasi__icon {
  border-style: dashed;
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--muted);
}

.mutasi__main {
  min-width: 0;
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
}

.mutasi.is-agregat .mutasi__main {
  border-style: dashed;
  background: var(--surface-soft);
}

.mutasi__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mutasi__title strong {
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.mutasi__amount {
  flex: none;
  color: var(--positive);
  font-size: 10.5px;
  font-weight: 750;
  white-space: nowrap;
}

.mutasi__amount.is-keluar {
  color: var(--danger);
}

.mutasi__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 7px;
  margin-top: 2px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.mutasi__doc {
  padding: 1px 5px;
  border: 1px solid #e2ece6;
  border-radius: 4px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 8.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mutasi__note {
  margin-top: 4px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.mutasi__saldo {
  display: inline-block;
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 650;
}

.mutasi-empty {
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

.detail-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 4px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.detail-note :deep(.icon) {
  margin-top: 1px;
}

.batch-detail__foot {
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
  .batch-detail__head {
    padding: 16px;
  }

  .batch-detail__body {
    padding: 16px;
  }

  .batch-detail__foot {
    padding: 12px 16px;
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero__value {
    font-size: 24px;
  }
}
</style>
