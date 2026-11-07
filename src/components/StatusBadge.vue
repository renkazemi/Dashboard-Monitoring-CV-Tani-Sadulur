<script setup>
import { computed } from 'vue'
import { STATUS_UMUR } from '../utils/inventory'

const props = defineProps({
  status: { type: String, default: 'aman' },
})

const info = computed(() => STATUS_UMUR[props.status] || STATUS_UMUR.aman)
</script>

<template>
  <span
    class="status-badge"
    :class="`status-badge--${status}`"
    :title="info.keterangan"
  >
    <span class="status-badge__dot" aria-hidden="true" />
    {{ info.label }}
  </span>
</template>

<style scoped>
.status-badge {
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

.status-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--aman {
  border-color: var(--positive-border);
  background: var(--positive-soft);
  color: var(--positive);
}

.status-badge--waspada {
  border-color: var(--warning-border);
  background: var(--warning-soft);
  color: var(--warning);
}

.status-badge--lewat {
  border-color: var(--danger-border);
  background: var(--danger-soft);
  color: var(--danger);
}

.status-badge--habis {
  border-color: var(--border);
  background: var(--surface-soft);
  color: var(--muted);
}
</style>
