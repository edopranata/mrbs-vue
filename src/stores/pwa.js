import { defineStore } from 'pinia'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// iPhone/iPad (termasuk iPadOS yang mengaku sebagai Mac) tidak punya prompt install otomatis.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * Status PWA: tombol install, versi baru dari service worker, dan status koneksi.
 */
export const usePwaStore = defineStore('pwa', {
  state: () => ({
    installEvent: null, // event beforeinstallprompt (Chrome/Edge di Android & desktop)
    standalone: isStandalone(),
    ios: isIos(),
    iosHelp: false,
    waitingWorker: null, // service worker versi baru yang menunggu dipakai
    online: navigator.onLine,
  }),

  getters: {
    canInstall: (s) => !s.standalone && (Boolean(s.installEvent) || s.ios),
  },

  actions: {
    init() {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault()
        this.installEvent = event
      })
      window.addEventListener('appinstalled', () => {
        this.installEvent = null
        this.standalone = true
      })
      window.addEventListener('online', () => (this.online = true))
      window.addEventListener('offline', () => (this.online = false))

      if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => this.register())
      }
    },

    async register() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        const track = (worker) => {
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) this.waitingWorker = worker
          })
        }
        if (registration.waiting && navigator.serviceWorker.controller) this.waitingWorker = registration.waiting
        registration.addEventListener('updatefound', () => track(registration.installing))

        // Cek versi baru saat aplikasi dibuka kembali dan setiap jam.
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && registration.update())
        setInterval(() => registration.update(), 60 * 60 * 1000)
      } catch (error) {
        console.warn('Service worker gagal didaftarkan:', error)
      }
    },

    async install() {
      if (this.installEvent) {
        this.installEvent.prompt()
        await this.installEvent.userChoice
        this.installEvent = null
      } else if (this.ios) {
        this.iosHelp = true
      }
    },

    applyUpdate() {
      if (!this.waitingWorker) return
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    },
  },
})
