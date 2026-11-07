import { computed, reactive, ref } from 'vue'
import { api } from '../utils/api'
import { muatData } from './gudang'

export const auth = reactive({ pengguna: null })

export const pengguna = computed(() => auth.pengguna)
export const sudahMasuk = computed(() => Boolean(auth.pengguna))
export const isAdmin = computed(() => auth.pengguna?.peran === 'admin')
export const pesanAkses = ref('')

/**
 * Pulihkan sesi dari cookie server saat aplikasi dibuka. Bila server mati,
 * pengguna tetap diarahkan ke halaman masuk dan pesan galat tampil di sana.
 */
export async function cekSesi() {
  try {
    const { pengguna: aktif } = await api('/sesi')
    auth.pengguna = aktif
    if (aktif) await muatData()
  } catch {
    auth.pengguna = null
  }
}

/** Kata sandi diperiksa server terhadap hash di basis data (K1). */
export async function masuk(identitas, sandi) {
  const aktif = await api('/login', {
    method: 'POST',
    body: { identitas: String(identitas).trim().toLowerCase(), sandi: String(sandi) },
  })
  await muatData()
  auth.pengguna = aktif
  return aktif
}

export async function keluar() {
  auth.pengguna = null
  pesanAkses.value = ''
  await api('/logout', { method: 'POST' }).catch(() => {})
}

export function tolakAkses(pesan) {
  pesanAkses.value = pesan
}

export function tutupPesanAkses() {
  pesanAkses.value = ''
}
