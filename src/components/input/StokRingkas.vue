<script setup>
import { computed } from 'vue'
import IconApp from '../IconApp.vue'
import { gudang, stokProduk } from '../../stores/gudang'
import { formatAngka, formatKg } from '../../utils/format'

const daftar = computed(() => {
  const produk = gudang.produk.filter((item) => item.jenis === 'tepung')
  const total = produk.reduce((jumlah, item) => jumlah + stokProduk(item.id), 0)

  return {
    total,
    baris: produk.map((item) => {
      const sisaKg = stokProduk(item.id)
      const jumlahBatch = gudang.batch.filter(
        (batch) => batch.produkId === item.id,
      ).length
      return {
        id: item.id,
        kemasan: item.kemasan,
        sisaKg,
        porsi: total ? (sisaKg / total) * 100 : 0,
        kemasanSisa: Math.floor(sisaKg / item.beratPerSatuan),
        satuan: item.kemasan.toLowerCase().startsWith('dus') ? 'dus' : 'karung',
        jumlahBatch,
      }
    }),
  }
})
</script>

<template>
  <section class="panel stok-panel" aria-labelledby="stok-judul">
    <div class="panel-head">
      <div>
        <h2 id="stok-judul" class="panel-title">Stok tepung</h2>
        <p class="panel-sub">Sisa per produk saat ini</p>
      </div>
      <span class="stok-total num">{{ formatKg(daftar.total) }}</span>
    </div>

    <div class="panel-body stok-body">
      <ul class="stok-list">
        <li v-for="item in daftar.baris" :key="item.id" class="stok-item">
          <div class="stok-item__top">
            <strong>{{ item.kemasan }}</strong>
            <span class="stok-item__kg num">{{ formatKg(item.sisaKg) }}</span>
          </div>

          <span class="stok-item__bar" aria-hidden="true">
            <span
              class="stok-item__fill"
              :style="{ width: `${item.sisaKg > 0 ? Math.max(item.porsi, 3) : 0}%` }"
            />
          </span>

          <span class="stok-item__meta">
            {{ formatAngka(item.kemasanSisa) }} {{ item.satuan }} ·
            {{ item.jumlahBatch }} batch
          </span>
        </li>
      </ul>

      <p class="stok-note">
        <IconApp nama="info" :ukuran="12" />
        Stok dihitung dari sisa batch aktif, bukan angka tetap.
      </p>
    </div>
  </section>
</template>

<style scoped>
.stok-panel {
  min-width: 0;
}

.stok-total {
  flex: none;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.stok-body {
  padding-top: 13px;
}

.stok-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.stok-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stok-item__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.stok-item__top strong {
  font-size: 11.5px;
  font-weight: 650;
}

.stok-item__kg {
  color: var(--text);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.stok-item__bar {
  display: block;
  height: 5px;
  overflow: hidden;
  border-radius: 99px;
  background: #eef1ea;
}

.stok-item__fill {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--brand-500);
}

.stok-item__meta {
  color: var(--muted);
  font-size: 9.5px;
}

.stok-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.45;
}
</style>
