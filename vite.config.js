import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // `npm run build:laravel`: hasil build ditaruh di public/app milik backend Laravel,
  // sehingga frontend & API disajikan dari satu domain. Aset dimuat dari /app/,
  // sedangkan URL halaman tetap di root (/, /jadwal, ...).
  const forLaravel = mode === 'laravel'

  return {
    base: forLaravel ? '/app/' : '/',
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: forLaravel
      ? {
          outDir: env.LARAVEL_APP_DIR || '../backend/public/app',
          emptyOutDir: true,
        }
      : {},
    server: {
      port: 5173,
      // Saat development, request /api diteruskan ke Laravel sehingga tidak perlu CORS.
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
