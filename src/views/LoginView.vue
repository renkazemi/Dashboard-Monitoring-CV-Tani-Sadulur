<script setup>
import { nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconApp from '../components/IconApp.vue'
import logoLengkap from '../assets/logo-tani-sadulur.png'
import logoTs from '../assets/logo-ts.png'
import { AKUN_DEMO } from '../data/akun'
import { masuk } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const identitas = ref('')
const sandi = ref('')
const tampilSandi = ref(false)
const memuat = ref(false)
const error = ref('')

const inputNama = ref(null)
const inputSandi = ref(null)

const tujuanAman = () => {
  const tujuan = route.query.redirect
  if (
    typeof tujuan === 'string' &&
    tujuan.startsWith('/') &&
    !tujuan.startsWith('//') &&
    tujuan !== '/login'
  ) {
    return tujuan
  }
  return '/'
}

async function kirim() {
  if (memuat.value) return

  error.value = ''

  if (!identitas.value.trim() || !sandi.value) {
    error.value = 'Isi nama pengguna dan kata sandi terlebih dahulu.'
    if (!identitas.value.trim()) inputNama.value?.focus()
    else inputSandi.value?.focus()
    return
  }

  memuat.value = true

  try {
    await masuk(identitas.value, sandi.value)
    await router.replace(tujuanAman())
  } catch (kesalahan) {
    error.value = kesalahan.message || 'Tidak dapat masuk. Coba lagi.'
    sandi.value = ''
    await nextTick()
    inputSandi.value?.focus()
  } finally {
    memuat.value = false
  }
}

async function isiAkun(akun) {
  identitas.value = akun.identitas
  sandi.value = akun.sandiDemo
  error.value = ''
  await nextTick()
  document.getElementById('login-masuk')?.focus()
}
</script>

<template>
  <div class="login-page">
    <section class="login-brand" aria-label="Tentang aplikasi">
      <div class="brand-top">
        <span class="brand-mark" aria-hidden="true">
          <img :src="logoTs" alt="" />
        </span>
        <div>
          <strong>CV Tani Sadulur</strong>
          <span>Gudang Bogor · Produksi tepung tapioka</span>
        </div>
      </div>

      <div class="brand-copy">
        <p class="brand-kicker">Dashboard monitoring gudang</p>
        <h1>Stok, batch, dan transaksi tepung dalam satu pandangan.</h1>
        <p class="brand-desc">
          Catat barang masuk, produksi, barang keluar, retur, dan koreksi tanpa
          berpindah dokumen. Sistem mengalokasikan batch tertua secara FIFO dan
          menjaga status umur tetap terpantau.
        </p>

        <ul class="brand-features">
          <li>
            <span class="feature-icon">
              <IconApp nama="check" :ukuran="13" />
            </span>
            FIFO otomatis dan stok per batch yang selalu cocok.
          </li>
          <li>
            <span class="feature-icon">
              <IconApp nama="check" :ukuran="13" />
            </span>
            Peringatan batch waspada dan lewat batas mutu.
          </li>
          <li>
            <span class="feature-icon">
              <IconApp name="check" :ukuran="13" />
            </span>
            Rekap bulanan siap dicetak atau disimpan sebagai PDF.
          </li>
        </ul>
      </div>

      <p class="brand-foot">
        <span class="brand-foot__dot" aria-hidden="true" />
        Prototipe capstone · Data contoh 30 hari
      </p>
    </section>

    <main id="konten-utama" class="login-main" tabindex="-1">
      <div class="login-card">
        <header class="login-head">
          <img
            class="login-logo"
            :src="logoLengkap"
            alt="Pabrik Tapioka CV Tani Sadulur"
            width="440"
            height="296"
          />
          <p class="login-kicker">Masuk ke sistem</p>
          <h2>Selamat datang</h2>
          <p>
            Gunakan akun admin gudang atau pemilik untuk membuka dashboard.
          </p>
        </header>

        <form class="login-form" novalidate @submit.prevent="kirim">
          <label class="field" for="login-identitas">
            <span>Nama pengguna</span>
            <span class="input-wrap">
              <IconApp nama="user" :ukuran="15" />
              <input
                id="login-identitas"
                ref="inputNama"
                v-model="identitas"
                type="text"
                name="identitas"
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
                placeholder="admin atau pemilik"
                :aria-invalid="Boolean(error)"
                :aria-describedby="error ? 'login-error' : undefined"
                autofocus
              />
            </span>
          </label>

          <label class="field" for="login-sandi">
            <span>Kata sandi</span>
            <span class="input-wrap">
              <IconApp nama="lock" :ukuran="15" />
              <input
                id="login-sandi"
                ref="inputSandi"
                v-model="sandi"
                :type="tampilSandi ? 'text' : 'password'"
                name="sandi"
                autocomplete="current-password"
                placeholder="Masukkan kata sandi"
                :aria-invalid="Boolean(error)"
                :aria-describedby="error ? 'login-error' : undefined"
              />
              <button
                type="button"
                class="eye-btn"
                :aria-label="
                  tampilSandi
                    ? 'Sembunyikan kata sandi'
                    : 'Tampilkan kata sandi'
                "
                :title="
                  tampilSandi
                    ? 'Sembunyikan kata sandi'
                    : 'Tampilkan kata sandi'
                "
                @click="tampilSandi = !tampilSandi"
              >
                <IconApp
                  :nama="tampilSandi ? 'eye-off' : 'eye'"
                  :ukuran="16"
                />
              </button>
            </span>
          </label>

          <div v-if="error" id="login-error" class="form-alert" role="alert">
            <IconApp nama="alert-circle" :ukuran="15" />
            <span>{{ error }}</span>
          </div>

          <button
            id="login-masuk"
            type="submit"
            class="submit-btn"
            :disabled="memuat"
          >
            <span>{{ memuat ? 'Memeriksa akun...' : 'Masuk' }}</span>
            <IconApp
              :nama="memuat ? 'clock' : 'arrow-right'"
              :ukuran="15"
            />
          </button>
        </form>

        <section class="demo-box" aria-labelledby="akun-demo-judul">
          <div class="demo-head">
            <h3 id="akun-demo-judul">Akun demo</h3>
            <span>Klik untuk mengisi formulir</span>
          </div>

          <ul class="demo-list">
            <li v-for="akun in AKUN_DEMO" :key="akun.id">
              <button
                type="button"
                class="demo-item"
                @click="isiAkun(akun)"
              >
                <span class="demo-avatar" aria-hidden="true">
                  {{ akun.inisial }}
                </span>
                <span class="demo-text">
                  <strong>{{ akun.labelPeran }}</strong>
                  <small>{{ akun.identitas }} · {{ akun.sandiDemo }}</small>
                </span>
                <IconApp nama="arrow-right" :ukuran="14" />
              </button>
            </li>
          </ul>
        </section>

        <p class="login-note">
          <IconApp nama="info" :ukuran="12" />
          Prototipe: kata sandi diperiksa server terhadap hash di basis data.
          Akun di atas hanya untuk demo.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  background: var(--bg);
}

.login-brand {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  gap: 40px;
  padding: 40px 56px;
  background:
    radial-gradient(90% 70% at 0% 0%, rgba(56, 132, 94, 0.4), transparent 58%),
    radial-gradient(80% 60% at 100% 100%, rgba(210, 154, 53, 0.18), transparent 62%),
    linear-gradient(150deg, var(--brand-900), var(--brand-950));
  color: #fff;
}

.login-brand::after {
  position: absolute;
  right: -120px;
  bottom: -150px;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 50%;
  box-shadow:
    0 0 0 46px rgba(255, 255, 255, 0.025),
    0 0 0 92px rgba(255, 255, 255, 0.018);
  content: '';
  pointer-events: none;
}

.brand-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.brand-mark img {
  width: 100%;
  height: auto;
}

.brand-top div {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.brand-top strong {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-top span {
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
}

.brand-copy {
  position: relative;
  z-index: 1;
  display: flex;
  max-width: 540px;
  flex-direction: column;
  justify-content: center;
  margin: auto 0;
}

.brand-kicker {
  color: #dfc58f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.brand-copy h1 {
  margin-top: 10px;
  font-size: clamp(30px, 3.4vw, 44px);
  font-weight: 750;
  letter-spacing: -0.04em;
  line-height: 1.12;
}

.brand-desc {
  max-width: 470px;
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 13.5px;
  line-height: 1.65;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 24px;
  margin-top: 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 12.5px;
  line-height: 1.5;
}

.feature-icon {
  display: grid;
  width: 23px;
  height: 23px;
  flex: none;
  place-items: center;
  border: 1px solid rgba(95, 206, 149, 0.28);
  border-radius: 7px;
  background: rgba(95, 206, 149, 0.12);
  color: #8fe0b6;
}

.brand-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 10.5px;
}

.brand-foot__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e2b45f;
}

.login-main {
  display: grid;
  place-items: center;
  padding: 40px 28px;
}

.login-card {
  width: min(424px, 100%);
}

.login-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.login-logo {
  display: block;
  width: 168px;
  height: auto;
  margin-bottom: 20px;
}

.login-kicker {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.login-head h2 {
  margin-top: 3px;
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.login-head > p:last-child {
  max-width: 360px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span:first-child {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 650;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrap > :deep(.icon) {
  position: absolute;
  left: 12px;
  color: var(--muted);
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  height: 44px;
  padding: 0 13px 0 37px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 12.5px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-wrap input::placeholder {
  color: #9aa69c;
}

.input-wrap input:focus {
  border-color: var(--brand-500);
  outline: none;
  box-shadow: 0 0 0 3px rgba(47, 142, 104, 0.12);
}

.input-wrap:has(input[aria-invalid='true']) input {
  border-color: var(--danger-border);
}

.eye-btn {
  position: absolute;
  right: 7px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
  color: var(--muted);
}

.eye-btn:hover {
  background: var(--surface-soft);
  color: var(--text);
}

.form-alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 10.5px;
  line-height: 1.5;
}

.form-alert :deep(.icon) {
  margin-top: 1px;
}

.submit-btn {
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  border-radius: 10px;
  background: var(--brand-800);
  color: #fff;
  font-size: 12.5px;
  font-weight: 650;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.submit-btn:hover:not(:disabled) {
  background: var(--brand-900);
}

.submit-btn:disabled {
  opacity: 0.62;
  cursor: progress;
}

.demo-box {
  padding: 12px;
  margin-top: 22px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.demo-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px 8px;
}

.demo-head h3 {
  font-size: 10.5px;
  font-weight: 700;
}

.demo-head span {
  color: var(--muted);
  font-size: 9px;
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.demo-item:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
}

.demo-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #f2ddb0, #d9b36c);
  color: #4b3510;
  font-size: 9.5px;
  font-weight: 800;
}

.demo-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.35;
}

.demo-text strong {
  font-size: 10.5px;
  font-weight: 650;
}

.demo-text small {
  color: var(--muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.demo-item :deep(.icon) {
  flex: none;
  color: var(--brand-600);
}

.login-note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
}

.login-note :deep(.icon) {
  margin-top: 1px;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-brand {
    gap: 20px;
    padding: 24px 28px 22px;
  }

  .brand-copy {
    margin: 6px 0 0;
  }

  .brand-copy h1 {
    max-width: 560px;
    margin-top: 6px;
    font-size: 25px;
  }

  .brand-desc,
  .brand-features,
  .brand-foot {
    display: none;
  }

  .login-main {
    padding: 28px;
  }
}

@media (max-width: 560px) {
  .login-brand {
    padding: 20px 20px 18px;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
  }

  .brand-top strong {
    font-size: 13.5px;
  }

  .brand-top span {
    font-size: 10px;
  }

  .brand-copy h1 {
    font-size: 21px;
  }

  .login-main {
    padding: 22px 20px 32px;
  }

  .login-head h2 {
    font-size: 23px;
  }
}
</style>
