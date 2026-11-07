import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CatatInformasiView from '../views/CatatInformasiView.vue'
import RiwayatGudangView from '../views/RiwayatGudangView.vue'
import BatchStokView from '../views/BatchStokView.vue'
import LaporanBulananView from '../views/LaporanBulananView.vue'
import PengaturanView from '../views/PengaturanView.vue'
import LoginView from '../views/LoginView.vue'
import { auth, sudahMasuk, tolakAkses } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { judul: 'Masuk', layout: 'auth', publik: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { judul: 'Dashboard' },
    },
    {
      path: '/catat-informasi',
      name: 'catat-informasi',
      component: CatatInformasiView,
      meta: { judul: 'Catat informasi', peran: ['admin'] },
    },
    {
      path: '/riwayat-gudang',
      name: 'riwayat-gudang',
      component: RiwayatGudangView,
      meta: { judul: 'Riwayat gudang' },
    },
    {
      path: '/batch-stok',
      name: 'batch-stok',
      component: BatchStokView,
      meta: { judul: 'Batch & stok' },
    },
    {
      path: '/laporan-bulanan',
      name: 'laporan-bulanan',
      component: LaporanBulananView,
      meta: { judul: 'Laporan bulanan' },
    },
    {
      path: '/pengaturan',
      name: 'pengaturan',
      component: PengaturanView,
      meta: { judul: 'Pengaturan', peran: ['admin'] },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta.publik) {
    if (to.name === 'login' && sudahMasuk.value) {
      return { name: 'dashboard' }
    }
    return true
  }

  if (!sudahMasuk.value) {
    return {
      name: 'login',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
    }
  }

  const peranDiizinkan = to.meta.peran
  if (
    Array.isArray(peranDiizinkan) &&
    !peranDiizinkan.includes(auth.pengguna.peran)
  ) {
    tolakAkses(
      `Halaman “${to.meta.judul}” hanya dapat dibuka oleh admin gudang. Akun pemilik hanya dapat melihat data.`,
    )
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.judul || 'Dashboard'} · CV Tani Sadulur`
})

export default router
