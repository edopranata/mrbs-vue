<script setup>
import { AlertTriangle } from 'lucide-vue-next'
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const dialog = ref(null)
let answer = false

// Jawaban diteruskan setelah animasi tutup selesai.
function choose(value) {
  answer = value
  dialog.value.close()
}
function onClosed() {
  ui.resolveConfirm(answer)
  answer = false
}
</script>

<template>
  <BaseModal v-if="ui.confirmDialog" ref="dialog" size="sm" :title="ui.confirmDialog.title" @close="onClosed">
    <div class="flex gap-3">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="ui.confirmDialog.danger ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'"
      >
        <AlertTriangle class="size-5" />
      </div>
      <p class="pt-2 text-sm text-slate-600">{{ ui.confirmDialog.message }}</p>
    </div>
    <template #footer>
      <button class="btn-secondary" @click="choose(false)">Batal</button>
      <button :class="ui.confirmDialog.danger ? 'btn-danger' : 'btn-primary'" @click="choose(true)">
        {{ ui.confirmDialog.confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
