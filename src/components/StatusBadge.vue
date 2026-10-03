<script setup>
import { computed } from 'vue'
import LiveDot from './LiveDot.vue'

const props = defineProps({
  booking: { type: Object, required: true },
})

const state = computed(() => {
  const b = props.booking
  if (b.status === 'cancelled') return { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700' }
  if (b.is_ongoing) return { label: 'Berlangsung', cls: 'bg-emerald-50 text-emerald-700' }
  if (b.has_ended) return { label: 'Selesai', cls: 'bg-slate-100 text-slate-600' }
  return { label: 'Terjadwal', cls: 'bg-indigo-50 text-indigo-700' }
})
</script>

<template>
  <span class="badge" :class="state.cls">
    <LiveDot v-if="booking.is_ongoing && booking.status !== 'cancelled'" />
    {{ state.label }}
  </span>
</template>
