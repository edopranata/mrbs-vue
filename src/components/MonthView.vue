<script setup>
import { computed } from 'vue'
import { bookingType } from '@/lib/bookingTypes'
import { calendarDays, DAY_NAMES_SHORT, todayStr } from '@/lib/format'

const props = defineProps({
  month: { type: String, required: true },
  bookings: { type: Array, required: true }, // booking datar, masing-masing memuat `room`
  selected: { type: String, default: null },
})
const emit = defineEmits(['pick-date', 'open'])

const MAX_VISIBLE = 3
const today = todayStr()
const days = computed(() => calendarDays(props.month))

const byDate = computed(() => {
  const map = {}
  for (const b of props.bookings) (map[b.date] ??= []).push(b)
  for (const list of Object.values(map)) list.sort((a, b) => a.start_time.localeCompare(b.start_time))
  return map
})
</script>

<template>
  <div class="overflow-x-auto">
    <div class="grid min-w-[720px] grid-cols-7">
      <div
        v-for="d in DAY_NAMES_SHORT"
        :key="d"
        class="border-b border-slate-300 bg-white py-2 text-center text-xs font-semibold text-slate-600"
      >
        {{ d }}
      </div>
      <div
        v-for="day in days"
        :key="day"
        class="min-h-28 cursor-pointer border-b border-r border-slate-100 p-1.5 transition hover:bg-indigo-50/60 [&:nth-child(7n)]:border-r-0"
        :class="day.slice(0, 7) !== month.slice(0, 7) ? 'bg-slate-50/80' : 'bg-white'"
        @click="emit('pick-date', day)"
      >
        <div class="mb-1 flex justify-end">
          <span
            class="flex size-6 items-center justify-center rounded-full text-xs"
            :class="[
              day === selected ? 'bg-indigo-600 font-semibold text-white' : day === today ? 'font-semibold text-indigo-600' : '',
              day.slice(0, 7) !== month.slice(0, 7) && day !== selected ? 'text-slate-300' : '',
            ]"
          >
            {{ Number(day.slice(8)) }}
          </span>
        </div>
        <div class="space-y-0.5">
          <button
            v-for="b in (byDate[day] ?? []).slice(0, MAX_VISIBLE)"
            :key="b.id"
            type="button"
            class="block w-full truncate rounded-sm border-l-2 px-1 py-px text-left text-[11px]"
            :class="bookingType(b.type).block"
            :title="`${b.start_time}–${b.end_time} · ${b.room.name}\n${b.title}`"
            @click.stop="emit('open', b)"
          >
            <span class="font-semibold">{{ b.start_time }}</span> {{ b.room.code }} · {{ b.title }}
          </button>
          <p v-if="(byDate[day]?.length ?? 0) > MAX_VISIBLE" class="px-1 text-[11px] font-medium text-indigo-600">
            +{{ byDate[day].length - MAX_VISIBLE }} lainnya
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
