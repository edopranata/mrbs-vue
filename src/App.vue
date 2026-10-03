<script setup>
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import IosInstallHelp from '@/components/IosInstallHelp.vue'
import PwaBanner from '@/components/PwaBanner.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const settings = useSettingsStore()

// Judul tab ikut berubah saat pindah halaman maupun saat nama aplikasi dimuat/diubah.
watchEffect(() => {
  document.title = route.meta.title ? `${route.meta.title} · ${settings.app_name}` : settings.app_name
})

// Nama di layar utama iPhone/iPad mengikuti nama aplikasi di Pengaturan.
watchEffect(() => {
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', settings.app_name)
})
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
  <PwaBanner />
  <IosInstallHelp />
</template>
