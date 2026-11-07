import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { cekSesi } from './stores/auth'

// Sesi dan data dimuat sebelum router berjalan agar guard peran langsung tepat.
cekSesi().then(() => createApp(App).use(router).mount('#app'))
