<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import IconApp from '../IconApp.vue'
import StatusBadge from '../StatusBadge.vue'
import { formatAngka, formatKg, formatTanggal } from '../../utils/format'

const props = defineProps({
  batch: { type: Array, required: true },
  hitunganStatus: { type: Object, required: true },
})

const filter = ref('semua')
const urut = ref('terlama')
const daftarEl = ref(null)
const bisaGulir = ref(false)
const adaDiBawah = ref(false)
let pengamat = null

const opsiFilter = computed(() => [
  { value: 'semua', label: 'Semua', jumlah: props.batch.length },
  { value: 'aman', label: 'Aman', jumlah: props.hitunganStatus.aman },
  { value: 'waspada', label: 'Waspada', jumlah: props.hitunganStatus.waspada },
  { value: 'lewat', label: 'Lewat batas', jumlah: props.hitunganStatus.lewat },
])

const hasil = computed(() => {
  const daftar =
    filter.value === 'semua'
      ? props.batch
      : props.batch.filter((item) => item.status === filter.value)

  return [...daftar].sort((a, b) =>
    urut.value === 'terlama'
      ? a.tanggalProduksi.localeCompare(b.tanggalProduksi)
      : b.tanggalProduksi.localeCompare(a.tanggalProduksi),
  )
})

const labelUrut = computed(() =>
  urut.value === 'terlama' ? 'Terlama dulu' : 'Terbaru dulu',
)

function ukurGulir() {
  const el = daftarEl.value
  if (!el) return

  bisaGulir.value = el.scrollHeight - el.clientHeight > 4
  adaDiBawah.value = el.scrollTop + el.clientHeight < el.scrollHeight - 6
}

function keAtas() {
  daftarEl.value?.scrollTo({ top: 0 })
}

function ubahFilter(value) {
  filter.value = value
  keAtas()
}

function gantiUrutan() {
  urut.value = urut.value === 'terlama' ? 'terbaru' : 'terlama'
  keAtas()
}

onMounted(() => {
  ukurGulir()

  if (
    typeof ResizeObserver !== 'undefined' &&
    daftarEl.value?.firstElementChild
  ) {
    pengamat = new ResizeObserver(ukurGulir)
    pengamat.observe(daftarEl.value)
    pengamat.observe(daftarEl.value.firstElementChild)
  }
})

onBeforeUnmount(() => {
  pengamat?.disconnect()
  pengamat = null
})

watch(hasil, () => {
  keAtas()
  requestAnimationFrame(ukurGulir)
})
</script>

<template>
  <section id="daftar-batch" class="panel batch-card">
    <div class="panel-head batch-head">
      <div>
        <h2 class="panel-title">
          Batch tepung
          <span class="fifo-chip" title="Barang keluar diambil dari batch tertua">
            FIFO
          </span>
        </h2>
        <p class="panel-sub">
          Sisa stok per batch dan status umur berdasarkan tanggal produksi
        </p>
      </div>

      <button
        class="sort-btn"
        type="button"
        :title="`Urutkan: ${labelUrut}`"
        :aria-label="`Urutkan tanggal produksi: ${labelUrut}`"
        @click="gantiUrutan"
      >
        <IconApp nama="arrow-up-down" :ukuran="14" />
        {{ labelUrut }}
      </button>
    </div>

    <div class="panel-body batch-body">
      <div class="batch-toolbar">
        <div
          class="filters"
          role="group"
          aria-label="Filter status umur batch"
        >
          <button
            v-for="opsi in opsiFilter"
            :key="opsi.value"
            type="button"
            class="filter-pill"
            :class="{ 'is-active': filter === opsi.value }"
            :aria-pressed="filter === opsi.value"
            @click="ubahFilter(opsi.value)"
          >
            {{ opsi.label }}
            <span class="filter-pill__count num">{{ opsi.jumlah }}</span>
          </button>
        </div>

        <span class="batch-hint">
          <IconApp nama="clock" :ukuran="13" />
          Batas 6 &amp; 10 bulan
        </span>
      </div>

      <div
        v-if="hasil.length"
        class="batch-list"
        :class="{
          'is-scrollable': bisaGulir,
          'is-more': bisaGulir && adaDiBawah,
        }"
      >
        <div
          ref="daftarEl"
          class="table-scroll"
          tabindex="0"
          role="group"
          aria-label="Daftar batch tepung, gulir ke bawah untuk melihat batch lainnya"
          @scroll="ukurGulir"
        >
          <table class="batch-table">
            <caption class="sr-only">
              Daftar batch tepung beserta sisa stok dan status umurnya
            </caption>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th
                  scope="col"
                  :aria-sort="urut === 'terlama' ? 'ascending' : 'descending'"
                >
                  Tanggal produksi
                </th>
                <th scope="col">Umur</th>
                <th scope="col">Sisa stok</th>
                <th scope="col" class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in hasil" :key="item.id">
                <td data-label="Batch">
                  <div class="batch-id">
                    <span class="batch-code">{{ item.kode }}</span>
                    <span class="batch-product">{{ item.produk.kemasan }}</span>
                  </div>
                </td>
                <td data-label="Produksi" class="date-cell num">
                  {{ formatTanggal(item.tanggalProduksi) }}
                </td>
                <td data-label="Umur" class="age-cell num">
                  {{ item.umurLabel }}
                </td>
                <td data-label="Sisa stok">
                  <div class="sisa">
                    <span class="sisa__value num">{{ formatKg(item.sisaKg) }}</span>
                    <span
                      class="sisa__track"
                      role="img"
                      :aria-label="`${Math.round(
                        item.persenSisa,
                      )} persen dari hasil produksi masih tersisa`"
                    >
                      <span
                        class="sisa__fill"
                        :class="`is-${item.status}`"
                        :style="{ width: `${Math.max(item.persenSisa, 4)}%` }"
                      />
                    </span>
                  </div>
                </td>
                <td data-label="Status" class="status-cell">
                  <StatusBadge :status="item.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="empty">
        <span class="empty__icon">
          <IconApp nama="package" :ukuran="22" />
        </span>
        <strong>Tidak ada batch pada filter ini</strong>
        <p>Pilih status lain untuk melihat batch tepung.</p>
        <button type="button" class="empty__btn" @click="ubahFilter('semua')">
          Tampilkan semua batch
        </button>
      </div>

      <div v-if="hasil.length" class="batch-foot">
        <span class="batch-count" aria-live="polite">
          {{ formatAngka(hasil.length) }} batch · urut
          {{ urut === 'terlama' ? 'terlama' : 'terbaru' }}
        </span>
        <span v-if="bisaGulir && adaDiBawah" class="scroll-hint">
          <IconApp nama="arrow-down" :ukuran="12" />
          Gulir untuk batch lainnya
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.batch-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  scroll-margin-top: 80px;
}

.batch-head {
  flex-wrap: wrap;
  row-gap: 12px;
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

.sort-btn {
  display: inline-flex;
  height: 30px;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  transition: border-color 0.15s ease, color 0.15s ease,
    background 0.15s ease;
}

.sort-btn:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.batch-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding-top: 15px;
}

.batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.filter-pill {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}

.filter-pill:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
}

.filter-pill.is-active {
  border-color: var(--brand-800);
  background: var(--brand-800);
  color: #fff;
}

.filter-pill__count {
  display: inline-grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  padding: 0 4px;
  border-radius: 4px;
  background: #f0f3ec;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
}

.filter-pill.is-active .filter-pill__count {
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
}

.batch-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 10px;
  white-space: nowrap;
}

.table-scroll {
  min-width: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  max-height: clamp(240px, 40vh, 320px);
  border-radius: 2px;
}

.table-scroll:focus-visible {
  outline-offset: 3px;
}

.batch-list {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
}

.batch-list::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 30px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff);
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}

.batch-list.is-more::after {
  opacity: 1;
}

.batch-table {
  min-width: 540px;
  table-layout: fixed;
}

.batch-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
}

.batch-table th:first-child {
  padding-left: 2px;
}

.batch-table th:last-child,
.batch-table td:last-child {
  padding-right: 2px;
}

.batch-table th:nth-child(1) {
  width: 24%;
}

.batch-table th:nth-child(2) {
  width: 22%;
}

.batch-table th:nth-child(3) {
  width: 13%;
}

.batch-table th:nth-child(4) {
  width: 24%;
}

.batch-table th:nth-child(5) {
  width: 17%;
}

.batch-table .col-status {
  text-align: right;
}

.batch-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #eef1ea;
  color: var(--text-secondary);
  font-size: 11.5px;
  vertical-align: middle;
}

.batch-table td:first-child {
  padding-left: 2px;
}

.batch-table tbody tr {
  transition: background 0.13s ease;
}

.batch-table tbody tr:hover {
  background: var(--surface-soft);
}

.batch-table tbody tr:last-child td {
  border-bottom: 0;
}

.batch-id {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
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
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
}

.batch-product {
  overflow: hidden;
  max-width: 100%;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-cell,
.age-cell {
  white-space: nowrap;
}

.age-cell {
  color: var(--text);
  font-weight: 600;
}

.sisa {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-right: 14px;
}

.sisa__value {
  color: var(--text);
  font-size: 11.5px;
  font-weight: 650;
  white-space: nowrap;
}

.sisa__track {
  display: block;
  width: 100%;
  max-width: 110px;
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: #eef1ea;
}

.sisa__fill {
  display: block;
  height: 100%;
  border-radius: 99px;
}

.sisa__fill.is-aman {
  background: var(--brand-500);
}

.sisa__fill.is-waspada {
  background: var(--gold-500);
}

.sisa__fill.is-lewat {
  background: #cf5a49;
}

.status-cell {
  text-align: right;
}

.status-cell :deep(.status-badge) {
  margin-left: auto;
}

.batch-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 13px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}

.batch-count {
  color: var(--muted);
  font-size: 10.5px;
}

.scroll-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 650;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 16px;
  text-align: center;
}

.empty__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  margin-bottom: 10px;
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
}

.empty strong {
  font-size: 12.5px;
  font-weight: 650;
}

.empty p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.empty__btn {
  margin-top: 12px;
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 700px) {
  .batch-hint {
    display: none;
  }

  .batch-head .sort-btn {
    margin-left: auto;
  }

  .table-scroll {
    overflow-x: visible;
    overflow-y: auto;
    max-height: 58vh;
  }

  .batch-table {
    min-width: 0;
  }

  .batch-table,
  .batch-table tbody,
  .batch-table tr,
  .batch-table td {
    display: block;
    width: 100%;
  }

  .batch-table thead {
    display: none;
  }

  .batch-table tbody {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .batch-table tbody tr {
    padding: 12px 13px;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--surface);
  }

  .batch-table tbody tr:hover {
    background: var(--surface);
  }

  .batch-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    border: 0;
    text-align: left;
  }

  .batch-table td::before {
    color: var(--muted);
    content: attr(data-label);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .batch-table td:first-child {
    padding: 0 0 9px;
    margin-bottom: 3px;
    border-bottom: 1px dashed var(--border);
  }

  .batch-table td:first-child::before {
    display: none;
  }

  .batch-table td:last-child {
    padding: 8px 0 0;
    margin-top: 3px;
    border-top: 1px dashed var(--border);
  }

  .batch-id {
    width: 100%;
  }

  .sisa {
    flex: 1;
    align-items: flex-end;
    padding-right: 0;
  }

  .sisa__track {
    max-width: 100%;
  }

  .status-cell {
    text-align: left;
  }

  .status-cell :deep(.status-badge) {
    margin-left: 0;
  }
}
</style>
