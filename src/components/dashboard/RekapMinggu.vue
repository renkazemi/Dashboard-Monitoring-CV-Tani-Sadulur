<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import IconApp from '../IconApp.vue'
import { formatAngka, formatKg, formatRupiah } from '../../utils/format'

defineProps({
  minggu: { type: Object, required: true },
})

// Karung dan dus tidak dijumlahkan jadi satu angka; total dipisah per satuan.
function totalPerSatuan(daftar, kunci) {
  const total = {}
  for (const item of daftar) total[item.satuan] = (total[item.satuan] || 0) + item[kunci]
  return Object.entries(total).map(([satuan, jumlah]) => `${formatAngka(jumlah)} ${satuan}`)
}

const emit = defineEmits(['tutup'])
const dialogEl = ref(null)
let overflowSebelumnya = ''

// <dialog> bawaan sudah menangani Escape, jebakan fokus, dan pengembalian fokus,
// tapi tidak mengunci scroll halaman di belakangnya.
onMounted(() => {
  overflowSebelumnya = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialogEl.value.showModal()
})

onBeforeUnmount(() => {
  document.body.style.overflow = overflowSebelumnya
})

function klikLatar(event) {
  if (event.target === dialogEl.value) dialogEl.value.close()
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="rekap"
    aria-labelledby="rekap-minggu-judul"
    @close="emit('tutup')"
    @click="klikLatar"
  >
    <header class="rekap__head">
      <div>
        <p class="rekap__kicker">Rekap mingguan</p>
        <h2 id="rekap-minggu-judul">
          {{ minggu.labelRentang }}
          <em v-if="minggu.berjalan">berjalan</em>
        </h2>
      </div>
      <button
        class="rekap__close"
        type="button"
        aria-label="Tutup rekap mingguan"
        @click="dialogEl.close()"
      >
        <IconApp nama="x" :ukuran="17" />
      </button>
    </header>

    <div class="rekap__body">
      <div class="rekap__masuk">
        <span><span class="dot dot--in" /> Bahan baku masuk</span>
        <strong class="num">{{ formatKg(minggu.masukKg) }}</strong>
      </div>

      <table class="rekap__tabel">
        <caption><span class="dot dot--prod" /> Hasil produksi per produk</caption>
        <thead>
          <tr>
            <th scope="col">Produk</th>
            <th scope="col" class="num">Diproduksi</th>
            <th scope="col" class="num">Berat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in minggu.perProduk" :key="item.kunci">
            <th scope="row">{{ item.label }}</th>
            <td class="num">{{ formatAngka(item.produksiJumlah) }} {{ item.satuan }}</td>
            <td class="num">{{ formatKg(item.produksiKg) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total produksi</th>
            <td class="num">
              <span
                v-for="teks in totalPerSatuan(minggu.perProduk, 'produksiJumlah')"
                :key="teks"
                class="rekap__satuan"
              >{{ teks }}</span>
            </td>
            <td class="num">{{ formatKg(minggu.produksiKg) }}</td>
          </tr>
        </tfoot>
      </table>

      <table class="rekap__tabel">
        <caption><span class="dot dot--out" /> Penjualan per produk</caption>
        <thead>
          <tr>
            <th scope="col">Produk</th>
            <th scope="col" class="num">Terjual</th>
            <th scope="col" class="num">Berat</th>
            <th scope="col" class="num">Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in minggu.perProduk" :key="item.kunci">
            <th scope="row">{{ item.label }}</th>
            <td class="num">{{ formatAngka(item.keluarJumlah) }} {{ item.satuan }}</td>
            <td class="num">{{ formatKg(item.keluarKg) }}</td>
            <td class="num">{{ formatRupiah(item.nilaiKeluar) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total penjualan</th>
            <td class="num">
              <span
                v-for="teks in totalPerSatuan(minggu.perProduk, 'keluarJumlah')"
                :key="teks"
                class="rekap__satuan"
              >{{ teks }}</span>
            </td>
            <td class="num">{{ formatKg(minggu.keluarKg) }}</td>
            <td class="num">{{ formatRupiah(minggu.nilaiKeluar) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </dialog>
</template>

<style scoped>
.rekap {
  width: min(540px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-pop);
}

.rekap::backdrop {
  background: rgba(7, 24, 17, 0.46);
  backdrop-filter: blur(2px);
}

.rekap__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--border);
}

.rekap__kicker {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rekap__head h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.rekap__head em {
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--gold-50);
  color: var(--gold-600);
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.rekap__close {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
}

.rekap__close:hover {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.rekap__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 18px 20px;
}

.rekap__masuk {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 650;
}

.rekap__masuk strong {
  font-size: 16px;
  font-weight: 750;
}

.rekap__tabel {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.rekap__tabel caption {
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 700;
  text-align: left;
}

.rekap__tabel th,
.rekap__tabel td {
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.rekap__tabel thead th {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rekap__tabel tbody th {
  color: var(--text-secondary);
  font-weight: 500;
}

.rekap__tabel .num {
  padding-left: 12px;
  text-align: right;
  white-space: nowrap;
}

.rekap__tabel tfoot th,
.rekap__tabel tfoot td {
  border-bottom: 0;
  font-weight: 750;
  vertical-align: top;
}

.rekap__tabel .num {
  font-variant-numeric: tabular-nums;
}

.rekap__satuan {
  display: block;
}

@media (max-width: 480px) {
  .rekap__tabel .num {
    padding-left: 8px;
  }
}

.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 2px;
}

.dot--in {
  background: var(--brand-500);
}

.dot--prod {
  background: var(--blue-500);
}

.dot--out {
  background: var(--gold-500);
}
</style>
