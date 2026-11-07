<script setup>
import { computed } from 'vue'
import IconApp from '../IconApp.vue'
import { formatAngka, formatKg } from '../../utils/format'

const props = defineProps({
  perhatian: { type: Object, required: true },
  batas: { type: Object, required: true },
})

defineEmits(['lihat'])

const deskripsi = computed(() => {
  const bagian = []
  if (props.perhatian.lewat > 0) {
    bagian.push(
      `${formatKg(props.perhatian.beratLewat)} sudah melewati batas mutu ${
        props.batas.maksimalBulan
      } bulan`,
    )
  }
  if (props.perhatian.waspada > 0) {
    bagian.push(
      `${formatKg(props.perhatian.beratWaspada)} mendekati batas ${
        props.batas.peringatanBulan
      } bulan`,
    )
  }
  return `${bagian.join(' dan ')}. Prioritaskan pengeluaran batch tertua.`
})
</script>

<template>
  <div class="age-alert" role="status">
    <span class="age-alert__icon">
      <IconApp nama="alert-triangle" :ukuran="18" />
    </span>

    <div class="age-alert__text">
      <strong>
        {{ formatAngka(perhatian.total) }} batch perlu perhatian
      </strong>
      <p>{{ deskripsi }}</p>
    </div>

    <button type="button" class="age-alert__btn" @click="$emit('lihat')">
      Lihat batch
      <IconApp nama="arrow-right" :ukuran="14" />
    </button>
  </div>
</template>

<style scoped>
.age-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--warning-border);
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(253, 243, 224, 0.9), rgba(255, 253, 248, 0.9)),
    var(--surface);
}

.age-alert__icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border-radius: 9px;
  background: #f8e7c4;
  color: var(--warning);
}

.age-alert__text {
  min-width: 0;
  flex: 1;
}

.age-alert__text strong {
  display: block;
  color: #6f4a0e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.005em;
}

.age-alert__text p {
  margin-top: 2px;
  color: #8a6b34;
  font-size: 10.5px;
  line-height: 1.5;
}

.age-alert__btn {
  display: inline-flex;
  height: 30px;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid #e8d3a8;
  border-radius: 7px;
  background: var(--surface);
  color: var(--warning);
  font-size: 10.5px;
  font-weight: 700;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.age-alert__btn:hover {
  border-color: #dcbe80;
  background: #fffaf0;
}

@media (max-width: 640px) {
  .age-alert {
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 12px;
  }

  .age-alert__btn {
    width: 100%;
    justify-content: center;
    margin-top: 2px;
  }

  .age-alert__text p {
    font-size: 10.5px;
  }
}
</style>
