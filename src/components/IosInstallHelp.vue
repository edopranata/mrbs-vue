<script setup>
import { Share } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { usePwaStore } from '@/stores/pwa'

// iPhone/iPad tidak punya prompt install otomatis: tampilkan langkah "Tambah ke Layar Utama".
const pwa = usePwaStore()
</script>

<template>
  <BaseModal v-if="pwa.iosHelp" title="Install di iPhone / iPad" size="sm" @close="pwa.iosHelp = false">
    <ol class="list-decimal space-y-3 pl-5 text-sm text-slate-700">
      <li>Buka aplikasi ini di <strong>Safari</strong>.</li>
      <li class="flex-wrap">
        Ketuk tombol <strong>Bagikan</strong>
        <Share class="mx-1 inline size-4 align-[-2px] text-indigo-600" />
        di bagian bawah/atas layar.
      </li>
      <li>Pilih <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>), lalu ketuk <strong>Tambah</strong>.</li>
    </ol>
    <template #footer="{ close }">
      <button class="btn-primary" @click="close">Mengerti</button>
    </template>
  </BaseModal>
</template>
