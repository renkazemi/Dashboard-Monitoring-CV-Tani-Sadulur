<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import IconApp from './components/IconApp.vue'
import {
  drawerTerbuka,
  menuTersembunyi,
  mobile,
  perbaruiLayar,
  tutupDrawer,
} from './composables/useMenu'
import { pesanAkses, tutupPesanAkses } from './stores/auth'

const route = useRoute()
const halamanAuth = computed(() => route.meta.layout === 'auth')

const tanganiTombol = (event) => {
  if (event.key === 'Escape' && drawerTerbuka.value) tutupDrawer()
}

watch(drawerTerbuka, (terbuka) => {
  document.body.style.overflow = terbuka && mobile.value ? 'hidden' : ''
})

watch(
  () => route.fullPath,
  () => tutupDrawer(),
)

let timerPesan = null

watch(
  pesanAkses,
  (pesan) => {
    window.clearTimeout(timerPesan)
    if (pesan) {
      timerPesan = window.setTimeout(tutupPesanAkses, 8000)
    }
  },
  { immediate: true },
)

onMounted(() => {
  perbaruiLayar()
  window.addEventListener('keydown', tanganiTombol)
  window.addEventListener('resize', perbaruiLayar)
})

onBeforeUnmount(() => {
  window.clearTimeout(timerPesan)
  window.removeEventListener('keydown', tanganiTombol)
  window.removeEventListener('resize', perbaruiLayar)
  document.body.style.overflow = ''
})
</script>

<template>
  <RouterView v-if="halamanAuth" />

  <template v-else>
    <a class="skip-link" href="#konten-utama">Lewati ke konten</a>

    <div class="app" :class="{ 'app--menu-tersembunyi': menuTersembunyi }">
      <AppSidebar />

      <transition name="fade">
        <div
          v-if="drawerTerbuka"
          class="backdrop"
          aria-hidden="true"
          @click="tutupDrawer"
        />
      </transition>

      <div class="app__main">
        <RouterView />
      </div>
    </div>

    <transition name="toast">
      <div
        v-if="pesanAkses"
        class="akses-toast"
        role="alert"
        aria-live="assertive"
      >
        <span class="akses-toast__icon" aria-hidden="true">
          <IconApp nama="lock" :ukuran="16" />
        </span>
        <div class="akses-toast__text">
          <strong>Akses ditolak</strong>
          <p>{{ pesanAkses }}</p>
        </div>
        <button
          type="button"
          class="akses-toast__close"
          aria-label="Tutup pemberitahuan akses"
          title="Tutup"
          @click="tutupPesanAkses"
        >
          <IconApp nama="x" :ukuran="14" />
        </button>
      </div>
    </transition>
  </template>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.app__main {
  min-width: 0;
  min-height: 100vh;
  margin-left: 256px;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(7, 24, 17, 0.46);
  backdrop-filter: blur(2px);
}

.skip-link {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 100;
  padding: 9px 13px;
  border-radius: 8px;
  background: var(--brand-900);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  transform: translateY(-160%);
  transition: transform 0.16s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.akses-toast {
  position: fixed;
  top: 78px;
  right: 24px;
  z-index: 90;
  display: flex;
  width: min(380px, calc(100vw - 32px));
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 12px 13px;
  border: 1px solid var(--danger-border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 18px 46px -18px rgba(18, 34, 25, 0.42);
}

.akses-toast__icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
}

.akses-toast__text {
  min-width: 0;
  flex: 1;
}

.akses-toast__text strong {
  display: block;
  color: var(--danger);
  font-size: 11px;
  font-weight: 700;
}

.akses-toast__text p {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 10.5px;
  line-height: 1.5;
}

.akses-toast__close {
  display: grid;
  width: 25px;
  height: 25px;
  flex: none;
  place-items: center;
  border-radius: 6px;
  color: var(--muted);
}

.akses-toast__close:hover {
  background: var(--surface-soft);
  color: var(--text);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .akses-toast {
    top: 68px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}

@media (max-width: 1024px) {
  .app__main {
    margin-left: 0;
  }
}

@media (min-width: 1025px) {
  .app__main {
    transition: margin-left 0.22s cubic-bezier(0.3, 0.7, 0.3, 1);
  }

  .app--menu-tersembunyi .app__main {
    margin-left: 0;
  }

  .backdrop {
    display: none;
  }
}
</style>
