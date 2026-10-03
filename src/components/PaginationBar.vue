<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  meta: { type: Object, default: null },
})
const emit = defineEmits(['change'])
</script>

<template>
  <div v-if="props.meta && props.meta.last_page > 1" class="flex items-center justify-between gap-2 px-4 py-3 text-sm text-slate-600">
    <span>
      {{ props.meta.from }}–{{ props.meta.to }} dari {{ props.meta.total }}
    </span>
    <div class="flex items-center gap-1">
      <button class="btn-secondary btn-sm" :disabled="props.meta.current_page <= 1" @click="emit('change', props.meta.current_page - 1)">
        <ChevronLeft class="size-4" />
      </button>
      <span class="px-2">{{ props.meta.current_page }} / {{ props.meta.last_page }}</span>
      <button
        class="btn-secondary btn-sm"
        :disabled="props.meta.current_page >= props.meta.last_page"
        @click="emit('change', props.meta.current_page + 1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>
  </div>
</template>
