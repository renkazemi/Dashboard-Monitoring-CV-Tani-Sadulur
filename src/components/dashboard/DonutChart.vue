<script setup>
import { computed, ref } from 'vue'
import { formatDesimal } from '../../utils/format'

const props = defineProps({
  judul: { type: String, required: true },
  sub: { type: String, default: '' },
  // [{ kunci, label, nilai, warna, detail }]
  segmen: { type: Array, required: true },
  labelPusat: { type: String, default: 'Total' },
  formatNilai: { type: Function, required: true },
  kosong: { type: String, default: 'Belum ada data' },
})

const R = 42
const KELILING = 2 * Math.PI * R
const CELAH = 1.6

const aktif = ref(null)

const total = computed(() =>
  props.segmen.reduce((jumlah, item) => jumlah + item.nilai, 0),
)

const busur = computed(() => {
  let mulai = 0
  const terisi = props.segmen.filter((item) => item.nilai > 0)
  return props.segmen.map((item) => {
    const porsi = total.value ? item.nilai / total.value : 0
    const panjang = porsi * KELILING
    // Celah tipis antarsegmen hanya bila ada lebih dari satu segmen terisi.
    const celah = terisi.length > 1 && panjang > CELAH * 2 ? CELAH : 0
    const hasil = {
      ...item,
      porsi: porsi * 100,
      dash: `${Math.max(panjang - celah, 0)} ${KELILING}`,
      offset: -mulai,
    }
    mulai += panjang
    return hasil
  })
})

const pusat = computed(() => {
  const item = aktif.value !== null ? busur.value[aktif.value] : null
  return item
    ? {
        label: item.label,
        nilai: props.formatNilai(item.nilai),
        persen: `${formatDesimal(item.porsi)}%`,
      }
    : { label: props.labelPusat, nilai: props.formatNilai(total.value) }
})
</script>

<template>
  <section class="panel donut-card">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">{{ judul }}</h2>
        <p v-if="sub" class="panel-sub">{{ sub }}</p>
      </div>
    </div>

    <div class="panel-body donut-body">
      <div class="donut" :class="{ 'has-active': aktif !== null }">
        <svg viewBox="0 0 100 100" role="img" :aria-label="`${judul}: ${busur
          .map((item) => `${item.label} ${formatNilai(item.nilai)}`)
          .join(', ')}`">
          <circle class="donut__track" cx="50" cy="50" :r="R" />
          <circle
            v-for="(item, index) in busur"
            v-show="item.nilai > 0"
            :key="item.kunci"
            class="donut__arc"
            :class="{ 'is-active': aktif === index }"
            cx="50"
            cy="50"
            :r="R"
            :stroke="item.warna"
            :stroke-dasharray="item.dash"
            :stroke-dashoffset="item.offset"
            @mouseenter="aktif = index"
            @mouseleave="aktif = null"
          />
        </svg>
        <div class="donut__center" aria-hidden="true">
          <span class="donut__label">{{ pusat.label }}</span>
          <strong class="donut__value num">{{ total ? pusat.nilai : '—' }}</strong>
          <span v-if="pusat.persen" class="donut__pct num">{{ pusat.persen }}</span>
        </div>
      </div>

      <p v-if="!total" class="donut-empty">{{ kosong }}</p>

      <ul class="donut-legend">
        <li
          v-for="(item, index) in busur"
          :key="item.kunci"
          class="donut-legend__item"
          :class="{ 'is-dim': aktif !== null && aktif !== index }"
          tabindex="0"
          @mouseenter="aktif = index"
          @mouseleave="aktif = null"
          @focus="aktif = index"
          @blur="aktif = null"
        >
          <span class="donut-legend__dot" :style="{ background: item.warna }" />
          <span class="donut-legend__text">
            <strong>{{ item.label }}</strong>
            <span v-if="item.detail">{{ item.detail }}</span>
          </span>
          <span class="donut-legend__value num">
            {{ formatNilai(item.nilai) }}
            <em>{{ formatDesimal(item.porsi) }}%</em>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.donut-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  container-type: inline-size;
}

.donut-body {
  display: grid;
  flex: 1;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 22px;
  align-items: center;
}

.donut {
  position: relative;
  width: 148px;
  height: 148px;
}

.donut svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  transform: rotate(-90deg);
}

.donut__track {
  fill: none;
  stroke: var(--surface-soft);
  stroke-width: 13;
}

.donut__arc {
  fill: none;
  stroke-width: 13;
  cursor: default;
  transition: opacity 0.18s ease, stroke-width 0.18s ease;
}

.has-active .donut__arc:not(.is-active) {
  opacity: 0.3;
}

.donut__arc.is-active {
  stroke-width: 15;
}

.donut__center {
  position: absolute;
  inset: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.donut__label {
  max-width: 100%;
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut__value {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.donut__pct {
  margin-top: 1px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 650;
}

.donut-empty {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 12px;
}

.donut-legend {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}

.donut-legend__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  margin: 0 -8px;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease, opacity 0.15s ease;
}

.donut-legend__item:hover,
.donut-legend__item:focus-visible {
  background: var(--surface-soft);
}

.donut-legend__item.is-dim {
  opacity: 0.5;
}

.donut-legend__dot {
  width: 9px;
  height: 9px;
  flex: none;
  align-self: flex-start;
  margin-top: 4px;
  border-radius: 3px;
}

.donut-legend__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.donut-legend__text strong {
  font-size: 12px;
  font-weight: 650;
}

.donut-legend__text span {
  color: var(--muted);
  font-size: 10.5px;
}

.donut-legend__value {
  display: flex;
  align-self: flex-start;
  flex-direction: column;
  align-items: flex-end;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.donut-legend__value em {
  color: var(--muted);
  font-size: 10.5px;
  font-style: normal;
  font-weight: 600;
}

/* Ukur lebar kartu, bukan layar: kartu sempit menumpuk donat di atas legenda. */
@container (max-width: 480px) {
  .donut-body {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    justify-items: center;
    gap: 16px;
  }

  .donut-legend {
    width: 100%;
  }
}
</style>
