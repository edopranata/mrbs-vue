<script setup>
import { CheckCircle2, X, XCircle } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end">
    <TransitionGroup
      enter-from-class="opacity-0 -translate-y-3 sm:translate-y-0 sm:translate-x-8"
      enter-active-class="transition duration-300 ease-out"
      leave-to-class="opacity-0 scale-95"
      leave-active-class="transition duration-200 ease-in"
      move-class="transition duration-300"
    >
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border bg-white p-3.5 shadow-lg"
        :class="t.type === 'error' ? 'border-red-200' : 'border-emerald-200'"
        role="status"
      >
        <XCircle v-if="t.type === 'error'" class="mt-0.5 size-5 shrink-0 text-red-500" />
        <CheckCircle2 v-else class="mt-0.5 size-5 shrink-0 text-emerald-500" />
        <p class="flex-1 text-sm text-slate-700">{{ t.message }}</p>
        <button class="text-slate-400 transition hover:rotate-90 hover:text-slate-600" aria-label="Tutup" @click="ui.dismiss(t.id)">
          <X class="size-4" />
        </button>
        <!-- Sisa waktu tampil -->
        <span
          class="absolute bottom-0 left-0 h-0.5 animate-shrink"
          :class="t.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'"
          :style="{ animationDuration: `${t.timeout}ms` }"
        />
      </div>
    </TransitionGroup>
  </div>
</template>
