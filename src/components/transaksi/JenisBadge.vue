<script setup>
import { computed } from 'vue'
import IconApp from '../IconApp.vue'
import { JENIS_BY_VALUE } from '../../data/jenisTransaksi'

const props = defineProps({
  jenis: { type: String, required: true },
  penuh: { type: Boolean, default: false },
})

const info = computed(
  () =>
    JENIS_BY_VALUE[props.jenis] || {
      label: props.jenis,
      pendek: props.jenis,
      ikon: 'receipt',
    },
)
</script>

<template>
  <span class="jenis-badge" :class="`is-${jenis}`" :title="info.label">
    <IconApp :nama="info.ikon" :ukuran="12" :tebal="2" />
    {{ penuh ? info.label : info.pendek }}
  </span>
</template>

<style scoped>
.jenis-badge {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.is-masuk {
  border-color: var(--positive-border);
  background: var(--positive-soft);
  color: var(--positive);
}

.is-produksi {
  border-color: #eadfd5;
  background: var(--clay-soft);
  color: var(--clay);
}

.is-keluar {
  border-color: var(--warning-border);
  background: var(--warning-soft);
  color: var(--warning);
}

.is-retur {
  border-color: #d9e5f2;
  background: #eef4fb;
  color: #3c5f8f;
}

.is-ditolak {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.is-koreksi {
  border-color: var(--border);
  background: var(--surface-soft);
  color: var(--text-secondary);
}
</style>
