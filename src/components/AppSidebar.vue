<script setup>
import { computed, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import IconApp from './IconApp.vue'
import logoTs from '../assets/logo-ts.png'
import {
  drawerTerbuka,
  menuTersembunyi,
  tutupMenu,
} from '../composables/useMenu'
import { auth, isAdmin, keluar } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const menu = [
  { label: 'Dashboard', ikon: 'dashboard', tujuan: '/' },
  {
    label: 'Catat informasi',
    ikon: 'receipt',
    tujuan: '/catat-informasi',
    peran: ['admin'],
  },
  { label: 'Riwayat gudang', ikon: 'file-text', tujuan: '/riwayat-gudang' },
  { label: 'Batch & stok', ikon: 'layers', tujuan: '/batch-stok' },
  { label: 'Laporan bulanan', ikon: 'scale', tujuan: '/laporan-bulanan' },
  {
    label: 'Pengaturan',
    ikon: 'sliders',
    tujuan: '/pengaturan',
    peran: ['admin'],
  },
]

const halamanAktif = computed(() => route.path)

const menuNavigasi = computed(() =>
  menu.filter(
    (item) =>
      !item.peran || item.peran.includes(auth.pengguna?.peran),
  ),
)

const sembunyikanMenu = () => {
  tutupMenu()
  nextTick(() => {
    document.getElementById('tombol-menu')?.focus()
  })
}

async function logout() {
  keluar()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <aside
    id="navigasi-utama"
    class="sidebar"
    :class="{
      'is-open': drawerTerbuka,
      'is-tersembunyi': menuTersembunyi,
    }"
    aria-label="Navigasi utama"
  >
    <div class="sidebar__brand">
      <div class="brand-mark">
        <img :src="logoTs" alt="Logo CV Tani Sadulur" />
      </div>
      <div class="brand-text">
        <strong>Tani Sadulur</strong>
        <span>Dashboard gudang</span>
      </div>
      <button
        class="close-btn"
        type="button"
        aria-label="Tutup menu navigasi"
        title="Tutup menu"
        @click="sembunyikanMenu"
      >
        <IconApp nama="x" :ukuran="18" />
      </button>
    </div>

    <nav class="sidebar__nav">
      <template v-for="item in menuNavigasi" :key="item.label">
        <RouterLink
          v-if="item.tujuan"
          :to="item.tujuan"
          class="nav-item"
          :class="{ 'is-active': halamanAktif === item.tujuan }"
          :aria-current="halamanAktif === item.tujuan ? 'page' : undefined"
        >
          <IconApp :nama="item.ikon" :ukuran="18" />
          <span>{{ item.label }}</span>
          <span
            v-if="halamanAktif === item.tujuan"
            class="nav-dot"
            aria-hidden="true"
          />
        </RouterLink>

        <span v-else class="nav-item is-disabled" aria-disabled="true">
          <IconApp :nama="item.ikon" :ukuran="18" />
          <span>{{ item.label }}</span>
          <span class="soon">Segera</span>
        </span>
      </template>
    </nav>

    <div class="sidebar__foot">
      <div v-if="!isAdmin" class="mode-note">
        <IconApp nama="lock" :ukuran="13" />
        <span>Mode pemilik: data hanya dapat dilihat.</span>
      </div>

      <div class="note">
        <span class="note-badge">
          <span class="note-dot" aria-hidden="true" />
          Prototipe
        </span>
        <p>Data contoh 30 hari, bukan data operasional perusahaan.</p>
      </div>

      <div v-if="auth.pengguna" class="user">
        <div class="avatar" aria-hidden="true">
          {{ auth.pengguna.inisial }}
        </div>
        <div class="user-info">
          <strong>{{ auth.pengguna.labelPeran }}</strong>
          <span>CV Tani Sadulur</span>
        </div>
        <button
          type="button"
          class="user-logout"
          aria-label="Keluar dari akun"
          title="Keluar"
          @click="logout"
        >
          <IconApp nama="log-out" :ukuran="16" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: flex;
  width: 256px;
  flex-direction: column;
  gap: 24px;
  padding: 22px 16px 18px;
  overflow-y: auto;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(56, 132, 94, 0.28), transparent 60%),
    linear-gradient(180deg, var(--brand-900) 0%, var(--brand-950) 100%);
  color: #fff;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border: 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 2px 6px 0;
}

/* Logo dirancang di atas putih; huruf S hijau tenggelam bila langsung di sidebar hijau. */
.brand-mark {
  display: grid;
  width: 39px;
  height: 39px;
  flex: none;
  place-items: center;
  padding: 5px;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.brand-mark img {
  width: 100%;
  height: auto;
}

.brand-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text strong {
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-text span {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  letter-spacing: 0.01em;
}

.close-btn {
  display: inline-flex;
  margin-left: auto;
  padding: 7px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.sidebar__nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  height: 41px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-item span:not(.soon):not(.nav-dot) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-item:not(.is-disabled):hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item.is-active {
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.11),
    rgba(255, 255, 255, 0.05)
  );
  color: #fff;
  font-weight: 600;
}

.nav-item.is-active::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: -16px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #e2b45f;
  content: '';
}

.nav-dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: #e2b45f;
  box-shadow: 0 0 0 4px rgba(226, 180, 95, 0.12);
}

.nav-item.is-disabled {
  color: rgba(255, 255, 255, 0.42);
  cursor: default;
}

.soon {
  padding: 2px 5px;
  margin-left: auto;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sidebar__foot {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 10px;
  border: 1px solid rgba(226, 180, 95, 0.18);
  border-radius: 9px;
  background: rgba(226, 180, 95, 0.08);
  color: #dfc58f;
  font-size: 9.5px;
  line-height: 1.5;
}

.mode-note :deep(.icon) {
  margin-top: 1px;
}

.note {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
}

.note-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #dfc58f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.note-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e2b45f;
}

.note p {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  line-height: 1.5;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.avatar {
  display: grid;
  width: 35px;
  height: 35px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #f2ddb0, #d9b36c);
  color: #4b3510;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.user-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.3;
}

.user-info strong {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info span {
  color: rgba(255, 255, 255, 0.45);
  font-size: 10.5px;
}

.user-logout {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.15s ease, color 0.15s ease;
}

.user-logout:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}

@media (min-width: 1025px) {
  .sidebar {
    transition: transform 0.22s cubic-bezier(0.3, 0.7, 0.3, 1),
      visibility 0s linear 0s;
  }

  .sidebar.is-tersembunyi {
    visibility: hidden;
    transform: translateX(-100%);
    transition: transform 0.22s cubic-bezier(0.3, 0.7, 0.3, 1),
      visibility 0s linear 0.22s;
  }
}

@media (max-width: 1024px) {
  .sidebar {
    visibility: hidden;
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.3, 0.7, 0.3, 1),
      visibility 0s linear 0.24s;
    box-shadow: 24px 0 60px -30px rgba(4, 20, 13, 0.7);
  }

  .sidebar.is-open {
    visibility: visible;
    transform: translateX(0);
    transition: transform 0.24s cubic-bezier(0.3, 0.7, 0.3, 1),
      visibility 0s linear 0s;
  }

  .close-btn {
    display: inline-flex;
  }
}
</style>
