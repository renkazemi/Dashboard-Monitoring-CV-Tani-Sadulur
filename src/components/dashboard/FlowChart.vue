<script setup>
import { computed, ref } from 'vue'
import IconApp from '../IconApp.vue'
import RekapMinggu from './RekapMinggu.vue'
import {
  formatAngka,
  formatKg,
  formatRupiah,
  formatRupiahRingkas,
} from '../../utils/format'

const props = defineProps({
  mingguan: { type: Array, required: true },
  total: { type: Object, required: true },
})

const aktif = ref(null)
const dipilih = ref(null)

const nilaiMaks = computed(() => {
  const tertinggi = Math.max(
    ...props.mingguan.flatMap((item) => [item.masukKg, item.produksiKg, item.keluarKg]),
    1,
  )
  const langkah = 10_000
  return Math.max(langkah, Math.ceil(tertinggi / langkah) * langkah)
})

const garis = computed(() =>
  [1, 0.75, 0.5, 0.25, 0].map((rasio) => ({
    rasio,
    nilai: nilaiMaks.value * rasio,
  })),
)

const tinggiBar = (nilai) =>
  nilai > 0 ? Math.max((nilai / nilaiMaks.value) * 100, 2) : 0

const tinggiTooltip = (item) =>
  Math.max(
    tinggiBar(item.masukKg),
    tinggiBar(item.produksiKg),
    tinggiBar(item.keluarKg),
  )

const labelSumbu = (nilai) => {
  if (!nilai) return '0'
  const ribu = nilai / 1000
  return `${formatAngka(ribu)} rb`
}
</script>

<template>
  <section class="panel chart-card">
    <div class="panel-head chart-head">
      <div>
        <h2 class="panel-title">Arus barang mingguan</h2>
        <p class="panel-sub">
          Enam minggu terakhir · klik batang untuk rincian per produk
        </p>
      </div>
      <div class="legend" aria-hidden="true">
        <span class="legend__item">
          <span class="legend__dot legend__dot--in" />
          Bahan baku masuk
        </span>
        <span class="legend__item">
          <span class="legend__dot legend__dot--prod" />
          Produksi
        </span>
        <span class="legend__item">
          <span class="legend__dot legend__dot--out" />
          Tepung keluar
        </span>
      </div>
    </div>

    <div class="panel-body chart-body">
      <div class="chart">
        <div class="chart__axis" aria-hidden="true">
          <span
            v-for="garisItem in garis"
            :key="garisItem.rasio"
            class="chart__tick"
            :style="{ bottom: `calc(${garisItem.rasio * 100}% - 7px)` }"
          >
            {{ labelSumbu(garisItem.nilai) }}
          </span>
        </div>

        <div class="chart__plot">
          <div class="chart__grid" aria-hidden="true">
            <span
              v-for="garisItem in garis"
              :key="garisItem.rasio"
              class="chart__line"
              :class="{ 'chart__line--base': garisItem.rasio === 0 }"
              :style="{ bottom: `${garisItem.rasio * 100}%` }"
            />
          </div>

          <div class="chart__groups" :class="{ 'has-active': aktif !== null }">
            <div
              v-for="(item, index) in mingguan"
              :key="item.awal"
              class="group"
              :class="{
                'is-active': aktif === index,
                'is-first': index === 0,
                'is-last': index === mingguan.length - 1,
              }"
              tabindex="0"
              role="button"
              aria-haspopup="dialog"
              :aria-label="`${item.labelRentang}: masuk ${formatKg(
                item.masukKg,
              )}, produksi ${formatKg(item.produksiKg)}, keluar ${formatKg(item.keluarKg)}, nilai ${formatRupiah(
                item.nilaiKeluar,
              )}. Buka rekap per produk`"
              :style="{ '--tinggi': tinggiTooltip(item) }"
              @mouseenter="aktif = index"
              @mouseleave="aktif = null"
              @focus="aktif = index"
              @blur="aktif = null"
              @click="dipilih = item"
              @keydown.enter.prevent="dipilih = item"
              @keydown.space.prevent="dipilih = item"
            >
              <div class="tooltip" :class="{ 'is-visible': aktif === index }">
                <span class="tooltip__range">
                  {{ item.labelRentang }}
                  <em v-if="item.berjalan">berjalan</em>
                </span>
                <span class="tooltip__row">
                  <span class="legend__dot legend__dot--in" />
                  Masuk
                  <strong class="num">{{ formatKg(item.masukKg) }}</strong>
                </span>
                <span class="tooltip__row">
                  <span class="legend__dot legend__dot--prod" />
                  Produksi
                  <strong class="num">{{ formatKg(item.produksiKg) }}</strong>
                </span>
                <span class="tooltip__row">
                  <span class="legend__dot legend__dot--out" />
                  Keluar
                  <strong class="num">{{ formatKg(item.keluarKg) }}</strong>
                </span>
                <span class="tooltip__row tooltip__row--nilai">
                  <span class="legend__dot legend__dot--value" />
                  Nilai keluar
                  <strong class="num">
                    {{ formatRupiahRingkas(item.nilaiKeluar) }}
                  </strong>
                </span>
              </div>

              <div class="group__bars">
                <span
                  class="bar bar--in"
                  :style="{ height: `${tinggiBar(item.masukKg)}%` }"
                />
                <span
                  class="bar bar--prod"
                  :style="{ height: `${tinggiBar(item.produksiKg)}%` }"
                />
                <span
                  class="bar bar--out"
                  :style="{ height: `${tinggiBar(item.keluarKg)}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="chart__labels">
          <span
            v-for="(item, index) in mingguan"
            :key="item.awal"
            class="chart__label"
          >
            {{ item.label }}
            <i
              v-if="item.berjalan"
              class="chart__now"
              title="Minggu berjalan"
            />
            <span
              v-if="index === mingguan.length - 1"
              class="sr-only"
              >(minggu berjalan)</span
            >
          </span>
        </div>
      </div>

      <div class="chart-foot">
        <div class="chart-total">
          <span class="chart-total__label">
            <span class="legend__dot legend__dot--in" />
            Total masuk
          </span>
          <strong class="num">{{ formatKg(total.masukKg) }}</strong>
        </div>
        <div class="chart-total">
          <span class="chart-total__label">
            <span class="legend__dot legend__dot--prod" />
            Total produksi
          </span>
          <strong class="num">{{ formatKg(total.produksiKg) }}</strong>
        </div>
        <div class="chart-total">
          <span class="chart-total__label">
            <span class="legend__dot legend__dot--out" />
            Total keluar
          </span>
          <strong class="num">{{ formatKg(total.keluarKg) }}</strong>
        </div>
        <div class="chart-total">
          <span class="chart-total__label">
            <span class="legend__dot legend__dot--value" />
            Nilai keluar
          </span>
          <strong class="num">
            {{ formatRupiahRingkas(total.nilaiKeluar) }}
          </strong>
        </div>
        <p class="chart-note">
          <IconApp nama="info" :ukuran="13" />
          Minggu berjalan dihitung sampai hari ini
        </p>
      </div>
    </div>

    <RekapMinggu v-if="dipilih" :minggu="dipilih" @tutup="dipilih = null" />
  </section>
</template>

<style scoped>
.chart-card {
  min-width: 0;
}

.chart-head {
  flex-wrap: wrap;
  row-gap: 12px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding-top: 3px;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.legend__dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 2px;
}

.legend__dot--in {
  background: var(--brand-500);
}

.legend__dot--prod {
  background: var(--blue-500);
}

.legend__dot--out {
  background: var(--gold-500);
}

.legend__dot--value {
  background: var(--text-secondary);
}

.chart-body {
  padding-top: 20px;
}

.chart {
  position: relative;
}

.chart__axis {
  position: absolute;
  top: 0;
  bottom: 26px;
  left: 0;
  width: 38px;
  pointer-events: none;
}

.chart__tick {
  position: absolute;
  right: 0;
  color: var(--muted);
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.chart__plot {
  position: relative;
  height: 218px;
  margin-left: 46px;
  padding-top: 10px;
}

.chart__grid {
  position: absolute;
  inset: 10px 0 0;
  pointer-events: none;
}

.chart__line {
  position: absolute;
  right: 0;
  left: 0;
  border-top: 1px dashed #e8ece4;
}

.chart__line--base {
  border-top-style: solid;
  border-top-color: var(--border-strong);
}

.chart__groups {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  align-items: flex-end;
}

.group {
  position: relative;
  display: flex;
  height: 100%;
  min-width: 0;
  flex: 1;
  align-items: flex-end;
  justify-content: center;
  padding: 0 3px 0;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  outline-offset: -1px;
}

.group__bars {
  display: flex;
  width: 100%;
  max-width: 72px;
  height: 100%;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
}

.bar {
  display: block;
  width: 100%;
  max-width: 17px;
  min-height: 0;
  border-radius: 4px 4px 1px 1px;
  transition: height 0.45s cubic-bezier(0.2, 0.7, 0.3, 1),
    opacity 0.18s ease, filter 0.18s ease;
  transform-origin: bottom;
}

.bar--in {
  background: linear-gradient(180deg, #3d9c76, var(--brand-500));
}

.bar--prod {
  background: linear-gradient(180deg, var(--blue-400), var(--blue-500));
}

.bar--out {
  background: linear-gradient(180deg, #e0ae50, var(--gold-500));
}

.has-active .group:not(.is-active) .bar {
  opacity: 0.35;
}

.group.is-active .bar {
  filter: saturate(1.08);
}

.tooltip {
  position: absolute;
  bottom: calc(var(--tinggi) * 1% + 12px);
  left: 50%;
  z-index: 4;
  display: flex;
  width: 168px;
  flex-direction: column;
  gap: 5px;
  padding: 10px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.tooltip::after {
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 8px;
  height: 8px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.tooltip.is-visible {
  opacity: 1;
  transform: translate(-50%, 0);
}

.group.is-first .tooltip {
  left: 0;
  transform: translate(0, 4px);
}

.group.is-first .tooltip.is-visible {
  transform: translate(0, 0);
}

.group.is-first .tooltip::after {
  left: 26px;
}

.group.is-last .tooltip {
  right: 0;
  left: auto;
  transform: translate(0, 4px);
}

.group.is-last .tooltip.is-visible {
  transform: translate(0, 0);
}

.group.is-last .tooltip::after {
  right: 24px;
  left: auto;
  transform: rotate(45deg);
}

.tooltip__range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 1px;
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}

.tooltip__range em {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--gold-50);
  color: var(--gold-600);
  font-size: 8.5px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.tooltip__row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 10.5px;
}

.tooltip__row strong {
  margin-left: auto;
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}

.tooltip__row--nilai {
  padding-top: 5px;
  border-top: 1px solid var(--border);
}

.chart__labels {
  display: flex;
  margin: 9px 0 0 46px;
}

.chart__label {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 500;
  text-align: center;
}

.chart__now {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gold-500);
}

.chart-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  padding-top: 16px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
}

.chart-total {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-total__label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.chart-total strong {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.chart-note {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  color: var(--muted);
  font-size: 10px;
}

@media (max-width: 640px) {
  .chart__plot {
    height: 190px;
    margin-left: 38px;
  }

  .chart__axis {
    bottom: 26px;
    width: 30px;
  }

  .chart__tick {
    font-size: 9px;
  }

  .chart__labels {
    margin-left: 38px;
  }

  .chart__label {
    font-size: 8.5px;
  }

  .group {
    padding: 0 1px;
  }

  .group__bars {
    max-width: 44px;
    gap: 2px;
  }

  .legend {
    gap: 10px;
  }

  .chart-foot {
    gap: 14px;
  }

  .chart-note {
    width: 100%;
    margin-left: 0;
  }
}
</style>
