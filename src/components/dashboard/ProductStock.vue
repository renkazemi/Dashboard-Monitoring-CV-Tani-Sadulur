<script setup>
import IconApp from '../IconApp.vue'
import {
  formatAngka,
  formatDesimal,
  formatKg,
  formatRupiahRingkas,
} from '../../utils/format'

defineProps({
  produk: { type: Array, required: true },
  totalKg: { type: Number, required: true },
  hariKeluar: { type: Number, default: 0 },
})

const satuanKemasan = (item) =>
  item.beratPerSatuan === 10 ? 'dus' : 'karung'
</script>

<template>
  <section class="panel product-card">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">Stok per produk</h2>
        <p class="panel-sub">Tepung tapioka · dalam kilogram</p>
      </div>
      <span class="product-count">{{ produk.length }} produk</span>
    </div>

    <div class="panel-body">
      <ul class="product-list">
        <li v-for="(item, index) in produk" :key="item.id" class="product">
          <div class="product__top">
            <span class="product__icon" :class="`tone-${index}`">
              <IconApp nama="package" :ukuran="15" />
            </span>

            <div class="product__info">
              <strong>{{ item.kemasan }}</strong>
              <span>
                {{ formatAngka(item.kemasanSisa) }} {{ satuanKemasan(item) }} ·
                {{ item.jumlahBatch }} batch
              </span>
            </div>

            <div class="product__amount">
              <strong class="num">
                {{ formatAngka(item.sisaKg) }}<em>kg</em>
              </strong>
              <span class="num">{{ formatDesimal(item.porsi) }}%</span>
            </div>
          </div>

          <div
            class="product__track"
            role="img"
            :aria-label="`${item.kemasan} menyumbang ${formatDesimal(
              item.porsi,
            )} persen dari total stok tepung`"
          >
            <span
              class="product__fill"
              :class="`tone-${index}`"
              :style="{ width: `${Math.max(item.porsi, 2)}%` }"
            />
          </div>

          <div class="product__meta">
            <span>Nilai stok</span>
            <span class="num">{{ formatRupiahRingkas(item.nilaiStok) }}</span>
          </div>
        </li>
      </ul>

      <div
        v-if="hariKeluar"
        class="product-insight"
        title="Dihitung dari rata-rata barang keluar enam minggu terakhir"
      >
        <IconApp nama="clock" :ukuran="14" />
        <p>
          Total stok menutupi <strong>±{{ hariKeluar }} hari</strong> keluar.
        </p>
      </div>

      <div class="product-total">
        <span>Total stok tepung</span>
        <strong class="num">{{ formatKg(totalKg) }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.product-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.product-card .panel-body {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.product-count {
  flex: none;
  padding: 3px 8px;
  margin-top: 2px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.product__top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.product__icon {
  display: grid;
  width: 31px;
  height: 31px;
  flex: none;
  place-items: center;
  border-radius: 8px;
}

.product__icon.tone-0 {
  background: var(--brand-50);
  color: var(--brand-600);
}

.product__icon.tone-1 {
  background: var(--gold-50);
  color: var(--gold-600);
}

.product__fill.tone-1 {
  background: var(--gold-500);
}

.product__icon.tone-2 {
  background: var(--clay-soft);
  color: var(--clay);
}

.product__fill.tone-2 {
  background: #c9825c;
}

.product__info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.35;
}

.product__info strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product__info span {
  overflow: hidden;
  color: var(--muted);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product__amount {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.3;
}

.product__amount strong {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.product__amount em {
  margin-left: 2px;
  color: var(--muted);
  font-size: 9.5px;
  font-style: normal;
  font-weight: 500;
}

.product__amount span {
  color: var(--muted);
  font-size: 9.5px;
}

.product__track {
  height: 6px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: #f0f3ec;
}

.product__fill {
  display: block;
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s cubic-bezier(0.2, 0.7, 0.3, 1);
}

.product__fill.tone-0 {
  background: linear-gradient(90deg, #3d9c76, var(--brand-500));
}

.product-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  margin-top: 0;
  border-top: 1px solid var(--border);
}

.product-total span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}

.product-total strong {
  font-size: 13px;
  font-weight: 750;
  letter-spacing: -0.015em;
}

.product__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 9.5px;
}

.product__meta span:last-child {
  color: var(--text-secondary);
  font-weight: 600;
}

.product-insight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  margin: auto 0 14px;
  border: 1px solid #dfece3;
  border-radius: 9px;
  background: var(--brand-50);
  color: var(--brand-600);
}

.product-insight p {
  color: var(--text-secondary);
  font-size: 10.5px;
}

.product-insight strong {
  color: var(--brand-700);
  font-weight: 700;
}

.product-list {
  padding-bottom: 16px;
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .product-list {
    gap: 16px;
  }
}
</style>
