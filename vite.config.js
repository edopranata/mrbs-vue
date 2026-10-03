import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

/** Semua file di folder public (ikon, manifest, favicon), relatif terhadap folder tsb. */
function publicFiles(dir, root = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? publicFiles(path, root) : [relative(root, path).split('\\').join('/')]
  })
}

/**
 * PWA: menghasilkan sw.js berisi daftar file yang disimpan di perangkat (precache) untuk build
 * ini. Isi sw.js berubah setiap build, sehingga browser mendeteksi versi baru.
 * Service worker selalu didaftarkan di /sw.js (scope seluruh situs); pada build Laravel,
 * /sw.js diarahkan ke app/sw.js oleh .htaccess / route backend.
 */
function mrbsServiceWorker({ forLaravel }) {
  let base = '/'
  return {
    name: 'mrbs-service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      // Build Laravel: manifest disajikan backend di /manifest.webmanifest (nama mengikuti Pengaturan).
      handler: (html) => (forLaravel ? html.replace(`href="${base}manifest.webmanifest"`, 'href="/manifest.webmanifest"') : html),
    },
    generateBundle: {
      // Dijalankan setelah plugin lain (termasuk pembuat index.html) selesai mengisi bundle.
      order: 'post',
      handler(_, bundle) {
        const files = [...new Set([...Object.keys(bundle), 'index.html', ...publicFiles('public')])]
          .filter((f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'manifest.webmanifest')
          .map((f) => base + f)
        // Versi dari isi file, sehingga perubahan apa pun (termasuk ikon) terdeteksi sebagai versi baru.
        const hash = createHash('sha256').update(files.join('\n'))
        for (const item of Object.values(bundle)) hash.update(item.code ?? item.source ?? '')
        for (const f of publicFiles('public')) hash.update(readFileSync(join('public', f)))
        const version = hash.digest('hex').slice(0, 12)
        const source = readFileSync('pwa/sw-template.js', 'utf8')
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(files, null, 2))
          .replace('__INDEX__', `${base}index.html`)
        this.emitFile({ type: 'asset', fileName: 'sw.js', source })
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // `npm run build:laravel`: hasil build ditaruh di public/app milik backend Laravel,
  // sehingga frontend & API disajikan dari satu domain. Aset dimuat dari /app/,
  // sedangkan URL halaman tetap di root (/, /jadwal, ...).
  const forLaravel = mode === 'laravel'

  return {
    base: forLaravel ? '/app/' : '/',
    plugins: [vue(), tailwindcss(), mrbsServiceWorker({ forLaravel })],
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
