<script setup>
import IconApp from '../IconApp.vue'
import { formatAngka, formatTanggalPendek } from '../../utils/format'

defineProps({
  aktivitas: { type: Array, required: true },
  total: { type: Number, default: 0 },
})
</script>

<template>
  <section class="panel activity-card">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">Aktivitas terbaru</h2>
        <p class="panel-sub">Enam transaksi terakhir di gudang</p>
      </div>
      <span class="activity-count">
        <IconApp nama="clock" :ukuran="11" />
        {{ aktivitas.length }} terbaru
      </span>
    </div>

    <div class="panel-body activity-body">
      <ul class="activity-list">
        <li
          v-for="item in aktivitas"
          :key="item.id"
          class="activity"
        >
          <span class="activity__icon" :class="`is-${item.jenis}`">
            <IconApp :nama="item.ikon" :ukuran="15" />
          </span>

          <div class="activity__main">
            <strong class="activity__title">{{ item.judul }}</strong>
            <span class="activity__meta">
              {{ item.labelJenis }} · {{ formatTanggalPendek(item.tanggal) }}
              <template v-if="item.meta"> · {{ item.meta }}</template>
            </span>
            <span
              v-if="item.alasan"
              class="activity__alasan"
              :title="item.alasan"
            >
              Alasan: {{ item.alasan }}
            </span>
          </div>

          <div class="activity__value">
            <strong
              class="activity__weight num"
              :class="item.negatif ? 'is-out' : 'is-in'"
            >
              {{ item.labelBerat }}
            </strong>
            <span v-if="item.nilaiLabel" class="activity__amount num">
              {{ item.nilaiLabel }}
            </span>
          </div>
        </li>
      </ul>

      <div class="activity-foot">
        <span>
          Menampilkan {{ aktivitas.length }} dari
          {{ formatAngka(total) }} transaksi
        </span>
        <span class="activity-foot__note">Data contoh</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.activity-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.activity-card .panel-body {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.activity-count {
  display: inline-flex;
  height: 22px;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 9px;
  font-weight: 600;
}

.activity-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 11px;
  margin-top: auto;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 9.5px;
}

.activity-foot__note {
  color: var(--muted);
  font-weight: 600;
}

.activity-body {
  padding-top: 8px;
}

.activity-list {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.activity {
  display: flex;
  flex: 1;
  min-height: 50px;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid #eef1ea;
}

.activity:last-child {
  padding-bottom: 2px;
  border-bottom: 0;
}

.activity__icon {
  display: grid;
  width: 31px;
  height: 31px;
  flex: none;
  place-items: center;
  border-radius: 8px;
}

.activity__icon.is-masuk {
  background: var(--positive-soft);
  color: var(--positive);
}

.activity__icon.is-produksi {
  background: #eaf3f3;
  color: #2a6d6c;
}

.activity__icon.is-keluar {
  background: var(--gold-50);
  color: var(--gold-600);
}

/* Warna disamakan dengan JenisBadge agar jenis yang sama terbaca sama. */
.activity__icon.is-retur {
  background: #eef4fb;
  color: #3c5f8f;
}

.activity__icon.is-ditolak {
  background: var(--danger-soft);
  color: var(--danger);
}

.activity__icon.is-koreksi {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.activity__alasan {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 9.5px;
  font-style: italic;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.activity__title {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: -0.005em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity__meta {
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity__value {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  line-height: 1.35;
}

.activity__weight {
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}

.activity__weight.is-in {
  color: var(--positive);
}

.activity__weight.is-out {
  color: var(--text-secondary);
}

.activity__amount {
  color: var(--muted);
  font-size: 9px;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .activity {
    padding: 12px 0;
  }

  .activity__title {
    font-size: 12px;
  }
}
</style>
