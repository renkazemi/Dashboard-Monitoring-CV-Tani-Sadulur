import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Backend Flask (backend/app.py) melayani /api di port 5000.
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
})
