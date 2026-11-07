<script setup>
import { computed } from 'vue'
import IconApp from '../IconApp.vue'
import StatusBadge from '../StatusBadge.vue'
import { gudang } from '../../stores/gudang'
import { keTanggalLokal } from '../../utils/tanggal'
import {
  hitungUmurBulan,
  hitungUmurHari,
  tentukanStatusUmur,
} from '../../utils/inventory'
import { formatKg, formatTanggal, formatUmur } from '../../utils/format'

const props = defineProps({
  alokasi: { type: Array, default: () => [] },
  kekuranganKg: { type: Number, default: 0 },
  stokSetelah: { type: Number, default: 0 },
})

const hariIni = keTanggalLokal(gudang.hariIni)

const baris = computed(() =>
  props.alokasi.map(({ batch, ambilKg }, index) => {
    const umurHari = hitungUmurHari(batch.tanggalProduksi, hariIni)
    const umurBulan = hitungUmurBulan(batch.tanggalProduksi, hariIni)
    return {
      id: batch.id,
      kode: batch.kode,
      tanggalProduksi: batch.tanggalProduksi,
      ambilKg,
      urutan: index + 1,
      umurLabel: formatUmur(umurHari),
      status: tentukanStatusUmur(umurBulan, gudang.pengaturan),
    }
  }),
)
</script>

<template>
  <section class="fifo" aria-labelledby="fifo-judul">
    <div class="fifo__head">
      <div>
        <h3 id="fifo-judul" class="fifo__title">Rencana pengambilan batch</h3>
        <p class="fifo__sub">
          Batch diambil dari tanggal produksi paling lama yang masih bersisa.
        </p>
      </div>
      <span class="fifo__count">{{ alokasi.length }} batch</span>
    </div>

    <ol v-if="baris.length" class="fifo__list">
      <li v-for="item in baris" :key="item.id" class="fifo-row">
        <span class="fifo-row__nomor num" aria-hidden="true">
          {{ item.urutan }}
        </span>

        <div class="fifo-row__main">
          <div class="fifo-row__top">
            <strong class="fifo-row__kode">{{ item.kode }}</strong>
            <StatusBadge :status="item.status" />
          </div>
          <span class="fifo-row__meta">
            Produksi {{ formatTanggal(item.tanggalProduksi) }} ·
            {{ item.umurLabel }}
          </span>
        </div>

        <span class="fifo-row__ambil num">{{ formatKg(item.ambilKg) }}</span>
      </li>
    </ol>

    <div v-if="kekuranganKg > 0" class="fifo__alert" role="alert">
      <IconApp nama="alert-triangle" :ukuran="15" />
      <span>
        Stok batch tidak cukup. Kekurangan
        <strong>{{ formatKg(kekuranganKg) }}</strong> — kurangi jumlah keluar
        atau catat produksi lebih dulu.
      </span>
    </div>

    <div v-else class="fifo__foot">
      <span>
        Sisa stok produk setelah transaksi:
        <strong class="num">{{ formatKg(stokSetelah) }}</strong>
      </span>
      <span class="fifo__note">Alokasi tersimpan bersama nota</span>
    </div>
  </section>
</template>

<style scoped>
.fifo {
  padding: 14px 15px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.fifo__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 11px;
}

.fifo__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.005em;
}

.fifo__sub {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.45;
}

.fifo__count {
  flex: none;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 9.5px;
  font-weight: 650;
  white-space: nowrap;
}

.fifo__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fifo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
}

.fifo-row__nomor {
  display: grid;
  width: 20px;
  height: 20px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 9.5px;
  font-weight: 750;
}

.fifo-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.fifo-row__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.fifo-row__kode {
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.fifo-row__meta {
  color: var(--muted);
  font-size: 10px;
}

.fifo-row__ambil {
  flex: none;
  color: var(--text);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.fifo__alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 10px;
  margin-top: 10px;
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 10.5px;
  line-height: 1.5;
}

.fifo__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed var(--border);
  color: var(--text-secondary);
  font-size: 10.5px;
}

.fifo__foot strong {
  color: var(--text);
}

.fifo__note {
  color: var(--muted);
  font-size: 9.5px;
}
</style>
