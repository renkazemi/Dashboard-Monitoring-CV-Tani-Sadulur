import { computed, ref } from 'vue'

const KUNCI_SIMPAN = 'cp-dashboard-menu-tersembunyi'
const BATAS_MOBILE = 1024

function bacaPreferensi() {
  try {
    return window.localStorage.getItem(KUNCI_SIMPAN) === '1'
  } catch {
    return false
  }
}

function simpanPreferensi() {
  try {
    window.localStorage.setItem(
      KUNCI_SIMPAN,
      menuTersembunyi.value ? '1' : '0',
    )
  } catch {
    // Bila localStorage diblokir, preferensi tetap berlaku selama sesi.
  }
}

export const mobile = ref(window.innerWidth <= BATAS_MOBILE)
export const drawerTerbuka = ref(false)
export const menuTersembunyi = ref(bacaPreferensi())

export const menuTampil = computed(() =>
  mobile.value ? drawerTerbuka.value : !menuTersembunyi.value,
)

export function toggleMenu() {
  if (mobile.value) {
    drawerTerbuka.value = !drawerTerbuka.value
    return
  }

  menuTersembunyi.value = !menuTersembunyi.value
  simpanPreferensi()
}

export function tutupMenu() {
  if (mobile.value) {
    drawerTerbuka.value = false
    return
  }

  menuTersembunyi.value = true
  simpanPreferensi()
}

export function tutupDrawer() {
  drawerTerbuka.value = false
}

export function perbaruiLayar() {
  mobile.value = window.innerWidth <= BATAS_MOBILE
  if (!mobile.value) drawerTerbuka.value = false
}
