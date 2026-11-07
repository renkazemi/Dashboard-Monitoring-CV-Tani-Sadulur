<script setup>
import { computed } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import IconApp from '../components/IconApp.vue'
import StatCard from '../components/StatCard.vue'
import AgeAlert from '../components/dashboard/AgeAlert.vue'
import BatchTable from '../components/dashboard/BatchTable.vue'
import DonutChart from '../components/dashboard/DonutChart.vue'
import FlowChart from '../components/dashboard/FlowChart.vue'
import ProductStock from '../components/dashboard/ProductStock.vue'
import RecentActivity from '../components/dashboard/RecentActivity.vue'
import { useDashboard } from '../composables/useDashboard'
import {
  JAM_SEKARANG,
  formatAngka,
  formatKg,
  formatRupiah,
  formatRupiahRingkas,
  pecahRupiah,
} from '../utils/format'

const {
  batchAktif,
  produk,
  transaksi,
  ringkasan,
  mingguan,
  totalArus,
  produksiPerProduk,
  penjualanPerProduk,
  aktivitas,
  infoHalaman,
} = useDashboard()

function lihatBatch() {
  document
    .getElementById('daftar-batch')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Warna mengikuti produk di semua grafik; urutan lolos uji palet buta warna.
const WARNA_PRODUK = ['var(--brand-500)', 'var(--gold-500)', 'var(--clay)']

const segmenProduksi = computed(() =>
  produksiPerProduk.value.map((item, index) => ({
    ...item,
    warna: WARNA_PRODUK[index % WARNA_PRODUK.length],
    detail: `${item.jumlahBatch} batch`,
  })),
)

const segmenPenjualan = computed(() =>
  penjualanPerProduk.value.map((item, index) => ({
    ...item,
    warna: WARNA_PRODUK[index % WARNA_PRODUK.length],
    detail: formatKg(item.beratKg),
  })),
)

const kartu = computed(() => {
  const nilaiStok = pecahRupiah(ringkasan.value.nilaiStok)
  const penjualan = pecahRupiah(ringkasan.value.penjualan.nilai)

  return [
    {
      kunci: 'stok',
      label: 'Stok tepung',
      nilai: formatAngka(ringkasan.value.stokKg),
      satuan: 'kg',
      ikon: 'package',
      tone: 'brand',
      meta: `${ringkasan.value.jumlahBatch} batch aktif · ±${ringkasan.value.hariKeluar} hari keluar`,
      judul: formatKg(ringkasan.value.stokKg),
    },
    {
      kunci: 'nilai',
      label: 'Nilai stok tepung',
      nilai: nilaiStok.nilai,
      satuan: nilaiStok.satuan,
      ikon: 'wallet',
      tone: 'gold',
      meta: 'Berdasarkan harga master produk',
      judul: formatRupiah(ringkasan.value.nilaiStok),
    },
    {
      kunci: 'bahan-baku',
      label: 'Bahan baku masuk',
      nilai: formatAngka(ringkasan.value.bahanBaku.beratKg),
      satuan: 'kg',
      ikon: 'truck',
      tone: 'clay',
      meta: `Bulan ini · ${ringkasan.value.bahanBaku.jumlahNota} nota · ${ringkasan.value.bahanBaku.jumlahPemasok} pemasok`,
      judul: 'Total berat bahan baku yang masuk bulan ini',
    },
    {
      kunci: 'produksi',
      label: 'Hasil produksi',
      nilai: formatAngka(ringkasan.value.produksi.beratKg),
      satuan: 'kg',
      ikon: 'factory',
      tone: 'brand',
      meta: `Bulan ini · ${ringkasan.value.produksi.jumlahNota} nota · ${ringkasan.value.produksi.jumlahBatch} batch`,
      judul: 'Total berat tepung hasil produksi bulan ini',
    },
    {
      kunci: 'penjualan',
      label: 'Penjualan bulan ini',
      nilai: penjualan.nilai,
      satuan: penjualan.satuan,
      ikon: 'trending-up',
      tone: 'teal',
      meta: `${formatKg(ringkasan.value.penjualan.beratKg)} · ${
        ringkasan.value.penjualan.jumlahNota
      } nota keluar`,
      judul: formatRupiah(ringkasan.value.penjualan.nilai),
    },
  ]
})
</script>

<template>
  <div class="dashboard">
    <AppTopbar :tanggal="infoHalaman.hariIni" />

    <main id="konten-utama" class="content" tabindex="-1">
      <header class="page-head">
        <div class="page-head__text">
          <p class="eyebrow">
            <span class="eyebrow__dot" aria-hidden="true" />
            CV Tani Sadulur · Gudang Bogor
          </p>
          <h1>Dashboard</h1>
          <p class="page-sub">
            Ringkasan stok dan transaksi tepung tapioka,
            {{ infoHalaman.bulan }}.
          </p>
        </div>

        <div class="page-head__actions">
          <span class="date-pill">
            <IconApp nama="calendar" :ukuran="14" />
            {{ infoHalaman.bulan }}
          </span>
          <span class="update-pill">
            <IconApp nama="clock" :ukuran="13" />
            Diperbarui {{ JAM_SEKARANG }}
          </span>
        </div>
      </header>

      <section class="stats" aria-label="Ringkasan stok dan transaksi">
        <StatCard
          v-for="item in kartu"
          :key="item.kunci"
          :label="item.label"
          :nilai="item.nilai"
          :satuan="item.satuan"
          :ikon="item.ikon"
          :tone="item.tone"
          :meta="item.meta"
          :judul="item.judul"
        />
      </section>

      <AgeAlert
        v-if="ringkasan.perhatian.total > 0"
        :perhatian="ringkasan.perhatian"
        :batas="infoHalaman.batas"
        @lihat="lihatBatch"
      />

      <div class="dashboard-grid">
        <FlowChart :mingguan="mingguan" :total="totalArus" />
        <ProductStock
          :produk="produk"
          :total-kg="ringkasan.stokKg"
          :hari-keluar="ringkasan.hariKeluar"
        />
      </div>

      <div class="dashboard-grid dashboard-grid--komposisi">
        <DonutChart
          judul="Hasil produksi per produk"
          sub="Berat tepung yang diproduksi, enam minggu terakhir"
          label-pusat="Total produksi"
          :segmen="segmenProduksi"
          :format-nilai="formatKg"
          kosong="Belum ada produksi dalam enam minggu terakhir"
        />
        <DonutChart
          judul="Penjualan per produk"
          :sub="`Nilai barang keluar, ${infoHalaman.bulan}`"
          label-pusat="Total penjualan"
          :segmen="segmenPenjualan"
          :format-nilai="formatRupiahRingkas"
          kosong="Belum ada barang keluar bulan ini"
        />
      </div>

      <div class="dashboard-grid dashboard-grid--bawah">
        <BatchTable
          :batch="batchAktif"
          :hitungan-status="ringkasan.hitunganStatus"
        />
        <RecentActivity
          :aktivitas="aktivitas"
          :total="transaksi.length"
        />
      </div>

      <footer class="page-foot">
        <span>
          Dashboard Monitoring Stok dan Transaksi Tepung Tapioka · CV Tani
          Sadulur
        </span>
        <span>Data contoh · Prototipe capstone</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
}

.content {
  width: 100%;
  max-width: 1480px;
  padding: 26px 30px 34px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.eyebrow__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold-500);
}

.page-head h1 {
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.page-sub {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12.5px;
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 2px;
}

.date-pill,
.update-pill {
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 11px;
  white-space: nowrap;
}

.date-pill {
  color: var(--text-secondary);
  font-weight: 650;
}

.update-pill {
  color: var(--muted);
}

/* Dua kartu stok di baris atas, tiga kartu arus bulan ini di bawahnya. */
.stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.stats > * {
  grid-column: span 2;
}

.stats > :nth-child(-n + 2) {
  grid-column: span 3;
}


.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  margin-top: 16px;
}

.age-alert {
  margin-top: 16px;
}

.dashboard-grid--komposisi {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-grid--bawah {
  margin-top: 16px;
}

.page-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 18px;
  margin-top: 22px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 9.5px;
  letter-spacing: 0.01em;
}

@media (max-width: 1120px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboard-grid--komposisi {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .dashboard-grid--komposisi {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .content {
    padding: 22px 20px 30px;
  }
}

@media (max-width: 640px) {
  .content {
    padding: 18px 16px 26px;
  }

  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-head h1 {
    font-size: 24px;
  }

  .page-sub {
    font-size: 12px;
  }

  .page-head__actions {
    width: 100%;
  }

  .update-pill {
    display: none;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stats > *,
  .stats > :nth-child(-n + 2) {
    grid-column: auto;
  }

  .stats > :last-child {
    grid-column: 1 / -1;
  }

  .dashboard-grid,
  .dashboard-grid--komposisi,
  .dashboard-grid--bawah,
  .age-alert {
    margin-top: 12px;
  }

  .dashboard-grid {
    gap: 12px;
  }

  .page-foot {
    font-size: 9px;
  }
}
</style>
