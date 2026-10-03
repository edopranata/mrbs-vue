<script setup>
import { RefreshCw, WifiOff } from 'lucide-vue-next'
import { usePwaStore } from '@/stores/pwa'

const pwa = usePwaStore()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
    <Transition
      enter-from-class="translate-y-4 opacity-0"
      enter-active-class="transition duration-300"
      leave-to-class="translate-y-4 opacity-0"
      leave-active-class="transition duration-200"
    >
      <div v-if="!pwa.online" class="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
        <WifiOff class="size-4" /> Tidak ada koneksi ke server — data booking tidak dapat dimuat.
      </div>
    </Transition>
    <Transition
      enter-from-class="translate-y-4 opacity-0"
      enter-active-class="transition duration-300"
      leave-to-class="translate-y-4 opacity-0"
      leave-active-class="transition duration-200"
    >
      <div
        v-if="pwa.waitingWorker"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-indigo-200 bg-white p-3 shadow-lg"
        role="status"
      >
        <RefreshCw class="size-5 shrink-0 text-indigo-600" />
        <p class="flex-1 text-sm text-slate-700">Versi baru aplikasi tersedia.</p>
        <button class="btn-primary btn-sm" @click="pwa.applyUpdate()">Muat ulang</button>
      </div>
    </Transition>
  </div>
</template>
