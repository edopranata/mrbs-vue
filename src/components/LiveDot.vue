<script setup>
// Titik berdenyut penanda sesuatu yang sedang berlangsung.
defineProps({
  color: { type: String, default: 'emerald' }, // emerald | red
})
const colors = {
  emerald: ['bg-emerald-400', 'bg-emerald-500'],
  red: ['bg-red-400', 'bg-red-500'],
}
</script>

<template>
  <span class="relative inline-flex size-2">
    <span class="absolute inline-flex size-full animate-ping rounded-full opacity-75" :class="colors[color][0]" />
    <span class="relative inline-flex size-2 rounded-full" :class="colors[color][1]" />
  </span>
</template>
