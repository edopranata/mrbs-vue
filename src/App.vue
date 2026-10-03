<script setup>
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const settings = useSettingsStore()

// Judul tab ikut berubah saat pindah halaman maupun saat nama aplikasi dimuat/diubah.
watchEffect(() => {
  document.title = route.meta.title ? `${route.meta.title} · ${settings.app_name}` : settings.app_name
})
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
