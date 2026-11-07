<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import IconApp from './IconApp.vue'
import { menuTampil, toggleMenu } from '../composables/useMenu'
import { auth, keluar } from '../stores/auth'

defineProps({
  tanggal: { type: String, default: '' },
  halaman: { type: String, default: 'Dashboard' },
})

const router = useRouter()
const pengguna = computed(() => auth.pengguna)

async function logout() {
  keluar()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button
        id="tombol-menu"
        class="menu-btn"
        type="button"
        :class="{ 'is-terbuka': menuTampil }"
        :aria-label="
          menuTampil
            ? 'Sembunyikan menu navigasi'
            : 'Tampilkan menu navigasi'
        "
        :aria-expanded="menuTampil"
        aria-controls="navigasi-utama"
        :title="menuTampil ? 'Sembunyikan menu' : 'Tampilkan menu'"
        @click="toggleMenu"
      >
        <IconApp nama="menu" :ukuran="20" />
      </button>

      <div class="crumbs" aria-label="Breadcrumb">
        <span class="crumbs__brand">CV Tani Sadulur</span>
        <IconApp nama="chevron-right" :ukuran="13" class="crumbs__sep" />
        <span class="crumbs__page">{{ halaman }}</span>
      </div>
    </div>

    <div class="topbar__right">
      <span
        class="data-chip"
        title="Prototipe memakai data contoh 30 hari; transaksi baru tersimpan di basis data server"
      >
        <span class="data-chip__dot" aria-hidden="true" />
        Data contoh
      </span>

      <span v-if="tanggal" class="topbar__date">
        <IconApp nama="calendar" :ukuran="15" />
        {{ tanggal }}
      </span>

      <span class="topbar__divider" aria-hidden="true" />

      <div v-if="pengguna" class="topbar__user">
        <span class="avatar" aria-hidden="true">{{ pengguna.inisial }}</span>
        <span class="user-text">
          <strong>{{ pengguna.labelPeran }}</strong>
        </span>
        <button
          type="button"
          class="logout-btn"
          aria-label="Keluar dari akun"
          title="Keluar"
          @click="logout"
        >
          <IconApp nama="log-out" :ukuran="16" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 30px;
  border-bottom: 1px solid rgba(214, 221, 209, 0.8);
  background: rgba(243, 245, 240, 0.84);
  backdrop-filter: blur(14px);
}

.topbar__left,
.topbar__right {
  display: flex;
  min-width: 0;
  align-items: center;
}

.topbar__left {
  gap: 12px;
}

.topbar__right {
  gap: 14px;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text-secondary);
}

.menu-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.menu-btn.is-terbuka {
  border-color: var(--border-strong);
  background: var(--surface-soft);
  color: var(--text);
}

.crumbs {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
}

.crumbs__brand {
  overflow: hidden;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumbs__sep {
  color: #aab5a8;
}

.crumbs__page {
  color: var(--text);
  font-weight: 650;
}

.data-chip {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid var(--gold-100);
  border-radius: 7px;
  background: var(--gold-50);
  color: var(--gold-600);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: help;
}

.data-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold-500);
}

.topbar__date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.topbar__divider {
  width: 1px;
  height: 24px;
  background: var(--border-strong);
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avatar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #f2ddb0, #d9b36c);
  color: #4b3510;
  font-size: 10.5px;
  font-weight: 800;
}

.user-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-text strong {
  font-size: 12px;
  font-weight: 650;
}

.user-text span {
  color: var(--muted);
  font-size: 10.5px;
}

.logout-btn {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 8px;
  color: var(--muted);
  transition: background 0.15s ease, color 0.15s ease;
}

.logout-btn:hover {
  background: var(--surface-soft);
  color: var(--text);
}

@media (max-width: 1024px) {
  .topbar {
    padding: 0 20px;
  }
}

@media (max-width: 860px) {
  .topbar__date,
  .topbar__divider {
    display: none;
  }
}

@media (max-width: 640px) {
  .topbar {
    height: 58px;
    padding: 0 16px;
  }

  .crumbs__brand,
  .crumbs__sep {
    display: none;
  }

  .data-chip {
    height: 25px;
    font-size: 10px;
  }

  .user-text {
    display: none;
  }

  .topbar__right {
    gap: 10px;
  }
}
</style>
