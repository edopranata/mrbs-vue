<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

// Angka yang "menghitung" dari nilai lama ke nilai baru.
const props = defineProps({
  value: { type: Number, required: true },
  duration: { type: Number, default: 700 },
})

const display = ref(0)
let frame

watch(
  () => props.value,
  (to) => {
    cancelAnimationFrame(frame)
    const from = display.value
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / props.duration, 1)
      const eased = 1 - (1 - t) ** 3
      display.value = Math.round(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  },
  { immediate: true },
)
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <span class="tabular-nums">{{ display }}</span>
</template>
