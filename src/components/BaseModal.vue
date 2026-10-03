<script setup>
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
})
const emit = defineEmits(['close'])

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

// Dialog mengatur tampilnya sendiri agar animasi keluar sempat diputar;
// event `close` baru dikirim setelah animasi selesai.
const visible = ref(false)
let closing = false

function close() {
  if (closing) return
  closing = true
  visible.value = false
}
defineExpose({ close })

function onKey(e) {
  if (e.key === 'Escape') close()
}
onMounted(() => {
  visible.value = true
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="{ enter: 280, leave: 200 }" @after-leave="emit('close')">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
        @mousedown.self="close"
      >
        <div
          class="modal-panel flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
          :class="widths[props.size]"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 class="text-base font-semibold text-slate-900">
              <slot name="title">{{ title }}</slot>
            </h2>
            <button class="btn-ghost -mr-2 p-1.5 hover:rotate-90" aria-label="Tutup" @click="close">
              <X class="size-5" />
            </button>
          </div>
          <div class="overflow-y-auto px-5 py-4">
            <slot :close="close" />
          </div>
          <div v-if="$slots.footer" class="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
