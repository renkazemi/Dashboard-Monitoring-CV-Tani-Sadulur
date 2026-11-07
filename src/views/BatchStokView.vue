<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DetailBatch from '../components/batch/DetailBatch.vue'
import { useBatchStok } from '../composables/useBatchStok'
import { isAdmin } from '../stores/auth'
import {
  formatAngka,
  formatBulan,
  formatHari,
  formatKg,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggal,
} from '../utils/format'

const { batchLengkap, produk, ringkasan, infoHalaman } = useBatchStok()

const hariIniLabel = formatHari(infoHalaman.value.hariIni)
const bulanLabel = formatBulan(`${infoHalaman.value.hariIni.slice(0, 7)}-01`)

const statusFilter = ref('aktif')
const produkId = ref('semua')
const cari = ref('')
const urut = ref('fifo')
const batchDetail = ref(null)

const statusOpsi = computed(() => [
  { value: 'semua', label: 'Semua', jumlah: ringkasan.value.hitunganStatus.semua },
  { value: 'aktif', label: 'Aktif', jumlah: ringkasan.value.hitunganStatus.aktif },
  { value: 'aman', label: 'Aman', jumlah: ringkasan.value.hitunganStatus.aman },
  {
    value: 'waspada',
    label: 'Waspada',
    jumlah: ringkasan.value.hitunganStatus.waspada,
  },
  {
    value: 'lewat',
    label: 'Lewat batas',
    jumlah: ringkasan.value.hitunganStatus.lewat,
  },
  { value: 'habis', label: 'Habis', jumlah: ringkasan.value.hitunganStatus.habis },
])

const hasil = computed(() => {
  const kata = cari.value.trim().toLowerCase()

  const daftar = batchLengkap.value.filter((item) => {
    if (statusFilter.value === 'aktif' && item.habis) return false
    if (statusFilter.value === 'habis' && !item.habis) return false
    if (
      !['semua', 'aktif', 'habis'].includes(statusFilter.value) &&
      (item.habis || item.statusUmur !== statusFilter.value)
    ) {
      return false
    }
    if (produkId.value !== 'semua' && item.produkId !== produkId.value) {
      return false
    }

    if (kata) {
      const teks = [
        item.kode,
        item.produk?.nama,
        item.produk?.kemasan,
        item.tanggalProduksi,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!teks.includes(kata)) return false
    }

    return true
  })

  return [...daftar].sort((a, b) => {
    if (urut.value === 'baru') {
      return b.tanggalProduksi.localeCompare(a.tanggalProduksi)
    }
    if (urut.value === 'sisa') {
      return (
        b.sisaKg - a.sisaKg ||
        a.tanggalProduksi.localeCompare(b.tanggalProduksi)
      )
    }
    if (urut.value === 'nilai') {
      return (
        b.nilaiStok - a.nilaiStok ||
        a.tanggalProduksi.localeCompare(b.tanggalProduksi)
      )
    }
    return a.tanggalProduksi.localeCompare(b.tanggalProduksi)
  })
})

const adaFilterAktif = computed(
  () =>
    Boolean(cari.value.trim()) ||
    produkId.value !== 'semua' ||
    statusFilter.value !== 'aktif' ||
    urut.value !== 'fifo',
)

const labelFilter = computed(
  () =>
    statusOpsi.value.find((item) => item.value === statusFilter.value)?.label ||
    'Semua',
)

const labelProduk = computed(
  () =>
    produk.value.find((item) => item.id === produkId.value)?.kemasan ||
    'Semua produk',
)

watch([cari, produkId, statusFilter, urut], () => {
  cari.value = cari.value.trimStart()
})

function satuanKemasan(item) {
  const kemasan = item.kemasan?.toLowerCase() || ''
  if (kemasan.startsWith('dus')) return 'dus'
  if (kemasan.startsWith('karung')) return 'karung'
  return 'kg'
}

function resetFilter() {
  cari.value = ''
  produkId.value = 'semua'
  statusFilter.value = 'aktif'
  urut.value = 'fifo'
}

function lihatProduk(item) {
  produkId.value = item.id
  statusFilter.value = 'semua'
  cari.value = ''
  nextTick(() => {
    document
      .getElementById('daftar-batch')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function bukaDetail(item) {
  batchDetail.value = item
}

function tutupDetail() {
  batchDetail.value = null
}
</script>

<template>
  <div class="batch-page">
    <AppTopbar :tanggal="hariIniLabel" halaman="Batch & stok" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Batch &amp; stok</h1>
          <p class="page-sub">
            Pantau sisa stok per batch, status umur, dan jejak mutasinya.
          </p>
        </div>

        <div class="page-head__actions">
          <span class="date-pill">
            <IconApp nama="calendar" :ukuran="14" />
            {{ bulanLabel }}
          </span>
          <RouterLink v-if="isAdmin" to="/catat-informasi" class="input-btn">
            <IconApp nama="plus" :ukuran="14" />
            Catat informasi
          </RouterLink>
        </div>
      </header>

      <section class="ringkasan" aria-label="Ringkasan batch dan stok">
        <div class="ringkasan__item">
          <span class="ringkasan__icon">
            <IconApp nama="package" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Stok aktif</span>
            <strong class="ringkasan__value num">
              {{ formatKg(ringkasan.stokKg) }}
            </strong>
            <span class="ringkasan__meta">
              {{ formatAngka(ringkasan.batchAktif) }} batch aktif ·
              {{ formatAngka(ringkasan.batchHabis) }} habis
            </span>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-gold">
            <IconApp nama="wallet" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Nilai stok aktif</span>
            <strong
              class="ringkasan__value num"
              :title="formatRupiah(ringkasan.nilaiStok)"
            >
              {{ formatRupiahRingkas(ringkasan.nilaiStok) }}
            </strong>
            <span class="ringkasan__meta">Harga master produk</span>
          </div>
        </div>

        <div class="ringkasan__item">
          <span class="ringkasan__icon is-soft">
            <IconApp nama="layers" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Batch tercatat</span>
            <strong class="ringkasan__value num">
              {{ formatAngka(ringkasan.batchAktif) }}
              <small>aktif</small>
            </strong>
            <span class="ringkasan__meta">
              dari {{ formatAngka(ringkasan.totalBatch) }} batch
            </span>
          </div>
        </div>

        <div class="ringkasan__item is-warning">
          <span class="ringkasan__icon is-warning">
            <IconApp nama="alert-triangle" :ukuran="15" />
          </span>
          <div>
            <span class="ringkasan__label">Perlu perhatian</span>
            <strong class="ringkasan__value num">
              {{ formatAngka(ringkasan.perhatian.jumlah) }}
              <small>batch</small>
            </strong>
            <span class="ringkasan__meta">
              {{ formatAngka(ringkasan.perhatian.waspada) }} waspada ·
              {{ formatAngka(ringkasan.perhatian.lewat) }} lewat batas
            </span>
          </div>
        </div>
      </section>

      <section class="produk-section" aria-labelledby="produk-judul">
        <div class="section-head">
          <div>
            <h2 id="produk-judul">Stok per produk</h2>
            <p>Distribusi stok aktif berdasarkan status umur batch.</p>
          </div>
          <span class="section-chip">{{ produk.length }} produk tepung</span>
        </div>

        <div class="produk-grid">
          <article
            v-for="(item, index) in produk"
            :key="item.id"
            class="produk-card"
          >
            <div class="produk-card__top">
              <span class="produk-card__icon" :class="`tone-${index}`">
                <IconApp nama="package" :ukuran="16" />
              </span>
              <div class="produk-card__title">
                <strong>{{ item.kemasan }}</strong>
                <span>{{ item.nama }}</span>
              </div>
              <button
                type="button"
                class="produk-card__link"
                aria-label="Lihat semua batch produk"
                @click="lihatProduk(item)"
              >
                Lihat batch
                <IconApp nama="chevron-right" :ukuran="12" />
              </button>
            </div>

            <div class="produk-card__hero">
              <div>
                <span>Stok aktif</span>
                <strong class="num">{{ formatKg(item.sisaKg) }}</strong>
              </div>
              <div class="is-right">
                <span>Nilai stok</span>
                <strong class="num" :title="formatRupiah(item.nilaiStok)">
                  {{ formatRupiahRingkas(item.nilaiStok) }}
                </strong>
              </div>
            </div>

            <div
              class="komposisi"
              role="img"
              :aria-label="`Komposisi stok ${item.kemasan} berdasarkan status umur batch`"
            >
              <span
                v-for="bagian in item.komposisi"
                v-show="bagian.persen > 0"
                :key="bagian.status"
                class="komposisi__part"
                :class="`is-${bagian.status}`"
                :style="{ width: `${bagian.persen}%` }"
                :title="`${bagian.label}: ${formatKg(bagian.beratKg)}`"
              />
            </div>

            <ul class="komposisi-legend">
              <li v-for="bagian in item.komposisi" :key="bagian.status">
                <span
                  class="legend-dot"
                  :class="`is-${bagian.status}`"
                  aria-hidden="true"
                />
                {{ bagian.label }}
                <strong class="num">{{ formatAngka(bagian.jumlah) }}</strong>
              </li>
            </ul>

            <div class="produk-card__foot">
              <span>
                {{ formatAngka(item.batchAktif) }} aktif ·
                {{ formatAngka(item.batchHabis) }} habis
              </span>
              <span class="num">
                {{ formatAngka(item.kemasanSisa) }} {{ satuanKemasan(item) }}
                setara
              </span>
            </div>
          </article>
        </div>
      </section>

      <section
        id="daftar-batch"
        class="panel daftar-panel"
        aria-labelledby="daftar-judul"
      >
        <div class="panel-head daftar-head">
          <div>
            <h2 id="daftar-judul" class="panel-title">
              Daftar batch
              <span class="count-chip num">{{ formatAngka(hasil.length) }}</span>
            </h2>
            <p class="panel-sub">
              Batch aktif dan habis, lengkap dengan sisa stok serta status
              umurnya.
            </p>
          </div>

          <div class="sort-control">
            <label for="urut-batch">Urutkan</label>
            <select id="urut-batch" v-model="urut">
              <option value="fifo">FIFO (terlama)</option>
              <option value="baru">Terbaru dulu</option>
              <option value="sisa">Sisa terbesar</option>
              <option value="nilai">Nilai terbesar</option>
            </select>
          </div>
        </div>

        <div class="panel-body daftar-body">
          <div class="batch-toolbar">
            <div
              class="filters"
              role="group"
              aria-label="Filter stok dan umur batch"
            >
              <button
                v-for="opsi in statusOpsi"
                :key="opsi.value"
                type="button"
                class="filter-pill"
                :class="{ 'is-active': statusFilter === opsi.value }"
                :aria-pressed="statusFilter === opsi.value"
                @click="statusFilter = opsi.value"
              >
                {{ opsi.label }}
                <span class="filter-pill__count num">{{ opsi.jumlah }}</span>
              </button>
            </div>

            <div class="filter-controls">
              <div class="input-wrap">
                <IconApp nama="search" :ukuran="14" />
                <label class="sr-only" for="cari-batch">Cari batch</label>
                <input
                  id="cari-batch"
                  v-model="cari"
                  type="search"
                  placeholder="Cari batch atau produk..."
                  autocomplete="off"
                />
              </div>

              <label class="sr-only" for="filter-produk-batch">Produk</label>
              <select id="filter-produk-batch" v-model="produkId">
                <option value="semua">Semua produk</option>
                <option v-for="item in produk" :key="item.id" :value="item.id">
                  {{ item.kemasan }}
                </option>
              </select>

              <button
                type="button"
                class="reset-btn"
                :disabled="!adaFilterAktif"
                @click="resetFilter"
              >
                <IconApp nama="undo" :ukuran="12" />
                Reset
              </button>
            </div>
          </div>

          <div v-if="!hasil.length" class="empty">
            <span class="empty__icon">
              <IconApp nama="layers" :ukuran="22" />
            </span>
            <strong>Tidak ada batch yang cocok</strong>
            <p>
              Coba ubah filter status, produk, atau kata kunci pencarian.
            </p>
            <button type="button" class="empty__btn" @click="resetFilter">
              Tampilkan batch aktif
            </button>
          </div>

          <template v-else>
            <div class="table-wrap">
              <table class="batch-table">
                <caption class="sr-only">
                  Daftar batch tepung beserta produksi, pemakaian, sisa stok,
                  nilai, dan status umurnya.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Batch</th>
                    <th scope="col">Produksi</th>
                    <th scope="col">Umur</th>
                    <th scope="col" class="col-angka">Masuk</th>
                    <th scope="col" class="col-angka">Terpakai</th>
                    <th scope="col" class="col-sisa">Sisa stok</th>
                    <th scope="col" class="col-nilai">Nilai</th>
                    <th scope="col" class="col-status">Status</th>
                    <th scope="col" class="col-aksi">
                      <span class="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in hasil"
                    :key="item.id"
                    :class="{ 'is-habis': item.habis }"
                  >
                    <td data-label="Batch">
                      <div class="batch-id">
                        <span class="batch-code">{{ item.kode }}</span>
                        <span class="batch-product">
                          {{ item.produk?.kemasan }}
                        </span>
                      </div>
                    </td>
                    <td data-label="Produksi" class="cell-date">
                      {{ formatTanggal(item.tanggalProduksi) }}
                    </td>
                    <td data-label="Umur" class="cell-age num">
                      {{ item.umurLabel }}
                    </td>
                    <td data-label="Masuk" class="cell-angka num">
                      {{ formatKg(item.totalMasukKg) }}
                      <span v-if="item.penyesuaianKg" class="cell-sub">
                        +{{ formatKg(item.penyesuaianKg) }} penyesuaian
                      </span>
                    </td>
                    <td data-label="Terpakai" class="cell-angka num">
                      {{ formatKg(item.terpakaiKg) }}
                    </td>
                    <td data-label="Sisa stok">
                      <div class="sisa">
                        <span class="sisa__value num">
                          {{ formatKg(item.sisaKg) }}
                        </span>
                        <span
                          class="sisa__track"
                          role="img"
                          :aria-label="`${Math.round(
                            item.persenSisa,
                          )} persen dari total masuk masih tersisa`"
                        >
                          <span
                            class="sisa__fill"
                            :class="`is-${item.statusTampil}`"
                            :style="{
                              width: `${item.sisaKg ? Math.max(item.persenSisa, 4) : 0}%`,
                            }"
                          />
                        </span>
                      </div>
                    </td>
                    <td
                      data-label="Nilai"
                      class="cell-nilai num"
                      :title="formatRupiah(item.nilaiStok)"
                    >
                      {{ formatRupiahRingkas(item.nilaiStok) }}
                    </td>
                    <td data-label="Status" class="cell-status">
                      <StatusBadge :status="item.statusTampil" />
                    </td>
                    <td class="cell-aksi">
                      <button
                        type="button"
                        class="detail-btn"
                        :aria-label="`Lihat detail batch ${item.kode}`"
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

            <ul class="batch-cards">
              <li
                v-for="item in hasil"
                :key="item.id"
                class="batch-card"
                :class="{ 'is-habis': item.habis }"
              >
                <div class="batch-card__top">
                  <StatusBadge :status="item.statusTampil" />
                  <span class="batch-card__date">
                    {{ formatTanggal(item.tanggalProduksi) }} ·
                    {{ item.umurLabel }}
                  </span>
                </div>

                <div class="batch-card__title">
                  <span class="batch-code">{{ item.kode }}</span>
                  <span>{{ item.produk?.kemasan }}</span>
                </div>

                <div class="batch-card__stats">
                  <div>
                    <span>Masuk</span>
                    <strong class="num">{{ formatKg(item.totalMasukKg) }}</strong>
                  </div>
                  <div>
                    <span>Terpakai</span>
                    <strong class="num">{{ formatKg(item.terpakaiKg) }}</strong>
                  </div>
                  <div>
                    <span>Sisa</span>
                    <strong class="num">{{ formatKg(item.sisaKg) }}</strong>
                  </div>
                </div>

                <div class="batch-card__foot">
                  <span class="batch-card__nilai num">
                    {{ formatRupiah(item.nilaiStok) }}
                  </span>
                  <button
                    type="button"
                    class="detail-btn"
                    :aria-label="`Lihat detail batch ${item.kode}`"
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
                Menampilkan {{ formatAngka(hasil.length) }} batch ·
                {{ labelFilter }}
                <template v-if="produkId !== 'semua'">
                  · {{ labelProduk }}
                </template>
              </span>
              <span class="foot-note">
                <IconApp nama="info" :ukuran="12" />
                Batch habis tetap ditampilkan agar jejak produksi terlacak.
              </span>
            </div>
          </template>
        </div>
      </section>

      <footer class="page-foot">
        <span>
          Stok dihitung dari hasil produksi + penyesuaian − pemakaian tiap
          batch.
        </span>
        <span>Data contoh · Prototipe capstone</span>
      </footer>
    </main>

    <DetailBatch
      v-if="batchDetail"
      :batch="batchDetail"
      @tutup="tutupDetail"
    />
  </div>
</template>

<style scoped>
.batch-page {
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.ringkasan__item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.ringkasan__item.is-warning {
  border-color: var(--warning-border);
  background: linear-gradient(180deg, #fffdf7, var(--surface));
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

.ringkasan__icon.is-gold {
  background: var(--gold-50);
  color: var(--gold-600);
}

.ringkasan__icon.is-soft {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.ringkasan__icon.is-warning {
  background: var(--warning-soft);
  color: var(--warning);
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

.ringkasan__meta {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.section-head h2 {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section-head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11.5px;
}

.section-chip {
  flex: none;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.produk-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.produk-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.produk-card__top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.produk-card__icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border-radius: 8px;
}

.produk-card__icon.tone-0 {
  background: var(--brand-50);
  color: var(--brand-600);
}

.produk-card__icon.tone-1 {
  background: var(--gold-50);
  color: var(--gold-600);
}

.produk-card__icon.tone-2 {
  background: var(--clay-soft);
  color: var(--clay);
}

.produk-card__title {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.3;
}

.produk-card__title strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.produk-card__title span {
  color: var(--muted);
  font-size: 10px;
}

.produk-card__link {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 1px;
  color: var(--brand-700);
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}

.produk-card__link:hover {
  color: var(--brand-900);
}

.produk-card__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0 10px;
}

.produk-card__hero > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.produk-card__hero .is-right {
  align-items: flex-end;
  text-align: right;
}

.produk-card__hero span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.produk-card__hero strong {
  margin-top: 1px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.25;
  white-space: nowrap;
}

.produk-card__hero .is-right strong {
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 700;
}

.komposisi {
  display: flex;
  height: 7px;
  overflow: hidden;
  border-radius: 99px;
  background: #eef1ea;
}

.komposisi__part {
  display: block;
  height: 100%;
}

.komposisi__part.is-aman {
  background: var(--brand-500);
}

.komposisi__part.is-waspada {
  background: var(--gold-500);
}

.komposisi__part.is-lewat {
  background: #cf5a49;
}

.komposisi-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 7px;
  color: var(--muted);
  font-size: 9px;
}

.komposisi-legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.komposisi-legend strong {
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 700;
}

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.legend-dot.is-aman {
  background: var(--brand-500);
}

.legend-dot.is-waspada {
  background: var(--gold-500);
}

.legend-dot.is-lewat {
  background: #cf5a49;
}

.produk-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 10px;
  padding-top: 9px;
  margin-top: 9px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 9px;
}

.produk-card__foot span:last-child {
  color: var(--text-secondary);
  font-weight: 600;
}

.daftar-panel {
  overflow: hidden;
  scroll-margin-top: 80px;
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

.daftar-body {
  padding: 14px 20px 16px;
}

.batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 13px;
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

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.input-wrap {
  position: relative;
}

.input-wrap :deep(.icon) {
  position: absolute;
  top: 50%;
  left: 9px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.input-wrap input,
.filter-controls select {
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text);
  font-size: 10.5px;
}

.input-wrap input {
  width: 190px;
  padding: 0 9px 0 29px;
}

.filter-controls select {
  max-width: 145px;
  padding: 0 25px 0 9px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%236b7a70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
}

.input-wrap input:focus-visible,
.filter-controls select:focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 1px;
}

.reset-btn {
  display: inline-flex;
  height: 32px;
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

.table-wrap {
  overflow-x: auto;
}

.batch-table {
  min-width: 1040px;
  table-layout: fixed;
}

.batch-table th {
  padding: 9px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.batch-table th:first-child,
.batch-table td:first-child {
  padding-left: 2px;
}

.batch-table th:last-child,
.batch-table td:last-child {
  padding-right: 2px;
}

.batch-table th:nth-child(1) {
  width: 17%;
}

.batch-table th:nth-child(2) {
  width: 11%;
}

.batch-table th:nth-child(3) {
  width: 9%;
}

.batch-table th:nth-child(4) {
  width: 11%;
}

.batch-table th:nth-child(5) {
  width: 11%;
}

.batch-table th:nth-child(6) {
  width: 15%;
}

.batch-table th:nth-child(7) {
  width: 12%;
}

.batch-table th:nth-child(8) {
  width: 10%;
}

.batch-table th:nth-child(9) {
  width: 4%;
}

.batch-table td {
  padding: 11px 8px;
  border-bottom: 1px solid #eef1ea;
  color: var(--text-secondary);
  font-size: 11px;
  vertical-align: middle;
}

.batch-table tbody tr {
  transition: background 0.13s ease;
}

.batch-table tbody tr:hover {
  background: var(--surface-soft);
}

.batch-table tbody tr.is-habis {
  background: #fbfcfa;
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
  max-width: 100%;
  padding: 2px 6px;
  overflow: hidden;
  border: 1px solid #e2ece6;
  border-radius: 5px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.02em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.batch-product {
  overflow: hidden;
  max-width: 100%;
  color: var(--muted);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-date,
.cell-age {
  white-space: nowrap;
}

.cell-age {
  color: var(--text);
  font-weight: 600;
}

.cell-angka {
  font-size: 10px;
  line-height: 1.4;
  white-space: nowrap;
}

.cell-sub {
  display: block;
  color: var(--muted);
  font-size: 8.5px;
  font-weight: 500;
}

.cell-nilai {
  text-align: right;
  white-space: nowrap;
}

.col-nilai {
  text-align: right;
}

.col-status {
  text-align: right;
}

.cell-status {
  text-align: right;
}

.cell-status :deep(.status-badge) {
  margin-left: auto;
}

.col-aksi,
.cell-aksi {
  padding-left: 2px;
  text-align: right;
}

.sisa {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-right: 12px;
}

.sisa__value {
  color: var(--text);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.sisa__track {
  display: block;
  width: 100%;
  max-width: 100px;
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

.sisa__fill.is-habis {
  background: #aeb8ac;
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

.batch-cards {
  display: none;
  flex-direction: column;
  gap: 9px;
}

.batch-card {
  padding: 12px 13px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
}

.batch-card.is-habis {
  background: var(--surface-soft);
}

.batch-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.batch-card__date {
  color: var(--muted);
  font-size: 9.5px;
  text-align: right;
}

.batch-card__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.batch-card__title .batch-code {
  max-width: 100%;
}

.batch-card__title > span:last-child {
  color: var(--text-secondary);
  font-size: 10.5px;
}

.batch-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed var(--border);
}

.batch-card__stats div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.batch-card__stats span {
  color: var(--muted);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.batch-card__stats strong {
  overflow: hidden;
  color: var(--text);
  font-size: 10.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
}

.batch-card__nilai {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.table-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding-top: 13px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}

.foot-info {
  color: var(--muted);
  font-size: 10px;
}

.foot-note {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 9.5px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 44px 16px;
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

@media (max-width: 1100px) {
  .produk-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .content {
    padding: 22px 20px 30px;
  }
}

@media (max-width: 980px) {
  .table-wrap {
    display: none;
  }

  .batch-cards {
    display: flex;
  }

  .batch-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-controls {
    width: 100%;
  }

  .input-wrap {
    flex: 1;
    min-width: 180px;
  }

  .input-wrap input {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .ringkasan {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .ringkasan__item {
    padding: 11px 12px;
  }

  .ringkasan__value {
    font-size: 14.5px;
  }

  .produk-grid {
    grid-template-columns: minmax(0, 1fr);
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

  .section-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .daftar-body {
    padding: 14px 16px;
  }

  .daftar-head {
    padding: 16px 16px 12px;
  }

  .sort-control {
    width: 100%;
    justify-content: space-between;
  }

  .filter-pill {
    height: 27px;
    padding: 0 8px;
    font-size: 10px;
  }

  .filter-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .input-wrap {
    grid-column: 1 / -1;
  }

  .reset-btn {
    justify-content: center;
  }

  .table-foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-foot {
    font-size: 9px;
  }
}
</style>
