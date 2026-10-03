<script setup>
import { Inbox } from 'lucide-vue-next'

defineProps({
  title: { type: String, default: 'Belum ada data' },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex animate-rise flex-col items-center justify-center px-4 py-10 text-center">
    <div class="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Inbox class="size-6" />
    </div>
    <p class="text-sm font-medium text-slate-700">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>
