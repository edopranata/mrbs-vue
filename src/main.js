import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { onUnauthorized } from './lib/api'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

onUnauthorized(() => {
  useAuthStore(pinia).clear()
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})

// Nama aplikasi & aturan booking (publik, dipakai juga di halaman login).
useSettingsStore(pinia).load().catch(() => {})

app.mount('#app')
