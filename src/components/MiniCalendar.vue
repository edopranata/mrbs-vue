<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { calendarDays, DAY_NAMES_SHORT, formatMonth, startOfWeek, todayStr } from '@/lib/format'

const props = defineProps({
  month: { type: String, required: true }, // tanggal mana pun di bulan yang ditampilkan
  selected: { type: String, default: null },
  highlightWeek: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'prev', 'next'])

const today = todayStr()
const days = computed(() => calendarDays(props.month))
const selectedWeek = computed(() => (props.highlightWeek && props.selected ? startOfWeek(props.selected) : null))

function dayClass(day) {
  // Tanggal milik bulan lain hanya tampil samar, tanpa sorotan.
  if (day.slice(0, 7) !== props.month.slice(0, 7)) return 'text-slate-300'
  if (day === props.selected) return 'bg-indigo-600 font-semibold text-white'
  const cls = []
  if (day === today) cls.push('font-semibold text-indigo-600')
  else cls.push('text-slate-700')
  if (selectedWeek.value && startOfWeek(day) === selectedWeek.value) cls.push('bg-indigo-50')
  return cls
}
</script>

<template>
  <div class="card p-3">
    <div class="mb-2 flex items-center justify-between">
      <button class="btn-ghost p-1" aria-label="Bulan sebelumnya" @click="emit('prev')"><ChevronLeft class="size-4" /></button>
      <Transition name="fade" mode="out-in">
        <span :key="month.slice(0, 7)" class="text-sm font-semibold capitalize text-slate-800">{{ formatMonth(month) }}</span>
      </Transition>
      <button class="btn-ghost p-1" aria-label="Bulan berikutnya" @click="emit('next')"><ChevronRight class="size-4" /></button>
    </div>
    <div class="grid grid-cols-7 text-center">
      <span v-for="d in DAY_NAMES_SHORT" :key="d" class="pb-1 text-[11px] font-medium text-slate-400">{{ d }}</span>
    </div>
    <Transition name="fade" mode="out-in">
      <div :key="month.slice(0, 7)" class="grid grid-cols-7 gap-y-0.5 text-center">
        <button
          v-for="day in days"
          :key="day"
          class="mx-auto flex size-7 items-center justify-center rounded-full text-xs transition hover:scale-110 hover:bg-indigo-100"
          :class="dayClass(day)"
          @click="emit('select', day)"
        >
          {{ Number(day.slice(8)) }}
        </button>
      </div>
    </Transition>
  </div>
</template>
