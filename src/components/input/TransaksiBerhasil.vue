<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import IconApp from '../IconApp.vue'
import { JENIS_BY_VALUE } from '../../data/jenisTransaksi'
import {
  formatAngka,
  formatKg,
  formatRupiah,
  formatTanggal,
} from '../../utils/format'

const props = defineProps({
  hasil: { type: Object, required: true },
})

defineEmits(['lagi'])

const infoJenis = computed(
  () => JENIS_BY_VALUE[props.hasil.transaksi.jenis] || {},
)

const produk = computed(() => props.hasil.produk || null)

const satuan = computed(() => {
  if (!produk.value) return 'unit'
  return produk.value.kemasan.toLowerCase().startsWith('dus') ? 'dus' : 'karung'
})

const alokasi = computed(() => props.hasil.alokasi || [])

const judulAlokasi = computed(() => {
  if (props.hasil.transaksi.jenis === 'retur') return 'Stok dikembalikan ke batch asal'
  return props.hasil.transaksi.jenis === 'koreksi' && props.hasil.arah === 'tambah'
    ? 'Stok ditambahkan ke batch'
    : 'Stok diambil dari batch (FIFO)'
})
</script>

<template>
  <section class="panel sukses" aria-labelledby="sukses-judul">
    <div class="panel-body sukses__body">
      <div class="sukses__head">
        <span class="sukses__icon" aria-hidden="true">
          <IconApp nama="check" :ukuran="22" :tebal="2.2" />
        </span>
        <div class="sukses__text">
          <p class="sukses__eyebrow">Tersimpan</p>
          <h2 id="sukses-judul" class="sukses__title">Transaksi berhasil dicatat</h2>
          <p class="sukses__sub">
            {{ infoJenis.label }} · {{ hasil.transaksi.nomorDokumen }}
          </p>
        </div>
      </div>

      <dl class="ringkas">
        <div class="ringkas__item">
          <dt>Tanggal</dt>
          <dd>{{ formatTanggal(hasil.transaksi.tanggal) }}</dd>
        </div>
        <div class="ringkas__item">
          <dt>Pihak</dt>
          <dd>{{ hasil.transaksi.pihak }}</dd>
        </div>
        <div v-if="produk" class="ringkas__item">
          <dt>Produk</dt>
          <dd>{{ produk.kemasan }}</dd>
        </div>
        <div v-if="produk" class="ringkas__item">
          <dt>Jumlah</dt>
          <dd class="num">
            {{ formatAngka(hasil.transaksi.jumlah) }} {{ satuan }}
          </dd>
        </div>
        <div class="ringkas__item">
          <dt>Berat</dt>
          <dd class="num">{{ formatKg(hasil.transaksi.beratKg) }}</dd>
        </div>
        <div v-if="hasil.transaksi.nilai > 0" class="ringkas__item">
          <dt>Nilai</dt>
          <dd class="num">{{ formatRupiah(hasil.transaksi.nilai) }}</dd>
        </div>
        <div v-if="produk" class="ringkas__item">
          <dt>Stok setelah</dt>
          <dd class="num">{{ formatKg(hasil.stokSesudah) }}</dd>
        </div>
        <div v-if="hasil.transaksi.batchKode" class="ringkas__item">
          <dt>Batch</dt>
          <dd class="num">
            {{ hasil.transaksi.batchKode }}
            <span class="ringkas__tag">
              {{ hasil.batchBaru ? 'baru' : 'digabung' }}
            </span>
          </dd>
        </div>
        <div v-if="hasil.arah" class="ringkas__item">
          <dt>Arah koreksi</dt>
          <dd>{{ hasil.arah === 'tambah' ? 'Menambah stok' : 'Mengurangi stok' }}</dd>
        </div>
      </dl>

      <div v-if="hasil.transaksi.keterangan" class="sukses__alasan">
        <span>Keterangan</span>
        <p>{{ hasil.transaksi.keterangan }}</p>
      </div>

      <div v-if="alokasi.length" class="sukses__alokasi">
        <p class="sukses__alokasi-title">{{ judulAlokasi }}</p>
        <ul class="sukses__alokasi-list">
          <li v-for="item in alokasi" :key="item.batchId">
            <span class="sukses__alokasi-kode">{{ item.kode }}</span>
            <span class="sukses__alokasi-tanggal">
              Produksi {{ formatTanggal(item.tanggalProduksi) }}
            </span>
            <strong class="num">{{ formatKg(item.beratKg) }}</strong>
          </li>
        </ul>
      </div>

      <p class="sukses__note">
        <IconApp nama="info" :ukuran="12" />
        Stok, batch, dan angka dashboard sudah diperbarui mengikuti transaksi ini.
      </p>

      <div class="sukses__actions">
        <button type="button" class="btn btn--primary" @click="$emit('lagi')">
          <IconApp nama="receipt" :ukuran="15" />
          Catat informasi lagi
        </button>
        <RouterLink to="/" class="btn btn--ghost">
          Buka dashboard
          <IconApp nama="arrow-right" :ukuran="14" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sukses {
  overflow: hidden;
}

.sukses__body {
  padding-top: 22px;
}

.sukses__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.sukses__icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  background: var(--positive-soft);
  color: var(--positive);
}

.sukses__eyebrow {
  color: var(--positive);
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sukses__title {
  margin-top: 3px;
  font-size: 17px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.sukses__sub {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11.5px;
}

.ringkas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 22px;
  padding: 17px 0;
  margin: 0;
}

.ringkas__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.ringkas__item dt {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ringkas__item dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

.ringkas__tag {
  display: inline-block;
  padding: 1px 5px;
  margin-left: 4px;
  border-radius: 4px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  vertical-align: 1px;
}

.sukses__alasan {
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-soft);
}

.sukses__alasan span {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sukses__alasan p {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.5;
}

.sukses__alokasi {
  padding-top: 15px;
  margin-top: 14px;
  border-top: 1px dashed var(--border);
}

.sukses__alokasi-title {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sukses__alokasi-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sukses__alokasi-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 10.5px;
}

.sukses__alokasi-kode {
  color: var(--brand-700);
  font-weight: 750;
}

.sukses__alokasi-tanggal {
  color: var(--muted);
  font-size: 9.5px;
}

.sukses__alokasi-list strong {
  margin-left: auto;
  font-size: 10.5px;
}

.sukses__note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 14px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.sukses__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 15px;
  margin-top: 15px;
  border-top: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  height: 39px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 11.5px;
  font-weight: 650;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn--primary {
  background: var(--brand-800);
  color: #fff;
}

.btn--primary:hover {
  background: var(--brand-900);
}

.btn--ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
}

.btn--ghost:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

@media (max-width: 640px) {
  .ringkas {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .sukses__actions .btn {
    flex: 1;
  }
}
</style>
