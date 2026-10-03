<script setup>
import { Repeat } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { bookingType } from '@/lib/bookingTypes'
import { minutesToTime, nowMinutes, timeToMinutes, todayStr } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useSettingsStore } from '@/stores/settings'

/**
 * Grid jadwal vertikal: baris = slot waktu, kolom = ruangan (tampilan hari)
 * atau hari (tampilan minggu). Klik / seret pada slot kosong untuk memilih jam.
 *
 * columns: [{ key, label, sublabel?, highlight?, date: 'YYYY-MM-DD', room, bookings: [] }]
 */
const props = defineProps({
  columns: { type: Array, required: true },
  openTime: { type: String, default: '07:00' },
  closeTime: { type: String, default: '20:00' },
})
const emit = defineEmits(['select', 'open'])

const ROW_H = 28 // px per baris

const auth = useAuthStore()
const modal = useBookingModal()
const settings = useSettingsStore()

// Satu baris = satu interval booking (MRBS_SLOT_MINUTES, default 30 menit).
const SLOT = settings.slot_minutes

const open = computed(() => timeToMinutes(props.openTime))
const close = computed(() => timeToMinutes(props.closeTime))
const slots = computed(() => {
  const list = []
  for (let m = open.value; m + SLOT <= close.value; m += SLOT) list.push(m)
  return list
})

const today = todayStr()
const now = ref(nowMinutes())
let ticker
onMounted(() => (ticker = setInterval(() => (now.value = nowMinutes()), 30_000)))

// ---- Status slot ----
function pastUntil(date) {
  if (date < today) return Infinity
  if (date > today) return -Infinity
  return now.value
}
const isPast = (col, m) => m < pastUntil(col.date)

function isBooked(col, m) {
  return col.bookings.some((b) => timeToMinutes(b.start_time) < m + SLOT && timeToMinutes(b.end_time) > m)
}
const isFree = (col, m) => m >= open.value && m + SLOT <= close.value && !isPast(col, m) && !isBooked(col, m)

// ---- Pemilihan slot (klik atau seret) ----
const selection = ref(null) // { col, anchor, current }
const dragging = ref(false)
let lastPointer = 'mouse'

const selRange = computed(() => {
  if (!selection.value) return null
  const { anchor, current } = selection.value
  return { from: Math.min(anchor, current), to: Math.max(anchor, current) }
})
const isSelected = (col, m) =>
  selection.value?.col.key === col.key && m >= selRange.value.from && m <= selRange.value.to

function onPointerDown(e, col, m) {
  lastPointer = e.pointerType
  if (e.pointerType !== 'mouse' || e.button !== 0 || !isFree(col, m)) return
  e.preventDefault()
  selection.value = { col, anchor: m, current: m }
  dragging.value = true
}

/** Perluas pilihan ke arah slot m, berhenti sebelum slot yang terpakai / sudah lewat. */
function onPointerEnter(col, m) {
  if (!dragging.value || selection.value.col.key !== col.key) return
  const { anchor } = selection.value
  const step = m >= anchor ? SLOT : -SLOT
  let cur = anchor
  while (cur !== m && isFree(col, cur + step)) cur += step
  selection.value.current = cur
}

function finish() {
  dragging.value = false
  const { col } = selection.value
  const { from, to } = selRange.value
  emit('select', {
    room: col.room,
    date: col.date,
    start_time: minutesToTime(from),
    // Satu slot saja = biarkan form memakai durasi default (1 jam).
    end_time: to > from ? minutesToTime(to + SLOT) : undefined,
  })
}

function onPointerUp() {
  if (dragging.value) finish()
}

// Sentuhan (HP/tablet): tap = pilih satu slot, tanpa seret agar tetap bisa scroll.
function onClick(col, m) {
  if (lastPointer === 'mouse' || !isFree(col, m)) return
  selection.value = { col, anchor: m, current: m }
  finish()
}

window.addEventListener('pointerup', onPointerUp)
onBeforeUnmount(() => {
  clearInterval(ticker)
  window.removeEventListener('pointerup', onPointerUp)
})

// Sorotan pilihan dipertahankan selama dialog booking terbuka.
watch(
  () => modal.formOpen,
  (isOpen) => {
    if (!isOpen && !dragging.value) selection.value = null
  },
)

// ---- Header menempel: samakan posisi scroll horizontal header & isi grid ----
const headerEl = ref(null)
const bodyEl = ref(null)
function syncScroll(from, to) {
  if (from && to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft
}

// ---- Posisi blok booking ----
function blockStyle(b) {
  const start = Math.max(timeToMinutes(b.start_time), open.value)
  const end = Math.min(timeToMinutes(b.end_time), close.value)
  return {
    top: `${((start - open.value) / SLOT) * ROW_H}px`,
    height: `${Math.max(((end - start) / SLOT) * ROW_H - 1, ROW_H / 2)}px`,
  }
}
const blockRows = (b) => (timeToMinutes(b.end_time) - timeToMinutes(b.start_time)) / SLOT

const nowTop = computed(() => ((now.value - open.value) / SLOT) * ROW_H)
const showNow = (col) => col.date === today && now.value > open.value && now.value < close.value
/** Titik berdenyut hanya di kolom pertama yang menampilkan garis waktu sekarang. */
const firstNowKey = computed(() => props.columns.find(showNow)?.key)

function slotClass(col, m, i) {
  if (isSelected(col, m)) return 'bg-indigo-200'
  if (isPast(col, m)) return 'cursor-not-allowed bg-slate-100/80'
  return [i % 2 ? 'bg-white' : 'bg-slate-50', 'cursor-pointer hover:bg-indigo-50']
}
</script>

<template>
  <div :class="{ 'select-none': dragging }">
    <!-- Header waktu & nama ruangan/hari: menempel tepat di bawah header aplikasi saat halaman
         di-scroll. Scroll horizontalnya disinkronkan dua arah dengan isi grid. -->
    <div
      ref="headerEl"
      class="sticky top-16 z-30 overflow-x-auto border-b border-slate-300 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      @scroll="syncScroll(headerEl, bodyEl)"
    >
      <div class="flex min-w-max">
        <div class="sticky left-0 z-10 flex h-14 w-16 shrink-0 items-end border-r border-slate-200 bg-white px-2 pb-2 text-xs font-semibold text-slate-600">
          Waktu
        </div>
        <div
          v-for="col in columns"
          :key="col.key"
          class="flex h-14 min-w-28 flex-1 flex-col items-center justify-center border-r border-slate-200 px-2 text-center last:border-r-0"
          :class="col.highlight ? 'bg-indigo-50' : 'bg-white'"
        >
          <p class="text-xs font-semibold leading-tight text-slate-800">{{ col.label }}</p>
          <p v-if="col.sublabel" class="text-[11px] text-slate-500">{{ col.sublabel }}</p>
        </div>
      </div>
    </div>

    <div ref="bodyEl" class="overflow-x-auto" @scroll="syncScroll(bodyEl, headerEl)">
      <div class="flex min-w-max">
        <!-- Kolom waktu -->
        <div class="sticky left-0 z-20 w-16 shrink-0 border-r border-slate-200 bg-white">
          <div
            v-for="(m, i) in slots"
            :key="m"
            class="px-2 text-xs leading-7 text-slate-600 tabular-nums"
            :class="i % 2 ? 'bg-white' : 'bg-slate-50'"
            :style="{ height: `${ROW_H}px` }"
          >
            {{ minutesToTime(m) }}
          </div>
        </div>

        <!-- Kolom ruangan / hari -->
        <div
          v-for="(col, ci) in columns"
          :key="col.key"
          class="min-w-28 flex-1 border-r border-slate-200 last:border-r-0"
        >
          <div class="relative">
            <div
              v-for="(m, i) in slots"
              :key="m"
              class="border-b border-slate-100 transition-colors"
              :class="slotClass(col, m, i)"
              :style="{ height: `${ROW_H}px` }"
              :title="isFree(col, m) ? `${minutesToTime(m)} — klik atau seret untuk booking` : undefined"
              @pointerdown="onPointerDown($event, col, m)"
              @pointerenter="onPointerEnter(col, m)"
              @click="onClick(col, m)"
            />

            <!-- Pilihan yang sedang diseret -->
            <div
              v-if="selection?.col.key === col.key"
              class="pointer-events-none absolute inset-x-1 rounded border-2 border-indigo-500 bg-indigo-500/10 px-1.5 text-[11px] font-semibold text-indigo-800 shadow-sm transition-all duration-100 ease-out"
              :style="{
                top: `${((selRange.from - open) / SLOT) * ROW_H}px`,
                height: `${((selRange.to - selRange.from) / SLOT + 1) * ROW_H}px`,
              }"
            >
              {{ minutesToTime(selRange.from) }}–{{ minutesToTime(selRange.to + SLOT) }}
            </div>

            <!-- Booking -->
            <button
              v-for="b in col.bookings"
              :key="b.id"
              type="button"
              class="absolute inset-x-0.5 origin-top animate-block-in overflow-hidden rounded-sm border-l-4 px-1.5 py-0.5 text-left transition hover:z-10 hover:shadow-lg"
              :class="[bookingType(b.type).block, { 'ring-2 ring-indigo-500 ring-inset': b.user_id === auth.user?.id }]"
              :style="{ ...blockStyle(b), ...stagger(ci, 35) }"
              :title="`${b.title}\n${b.start_time}–${b.end_time} · ${b.user?.name ?? ''}`"
              @click="emit('open', b)"
            >
              <p class="text-xs font-semibold leading-snug" :class="blockRows(b) < 2 ? 'truncate' : 'line-clamp-3'">
                <Repeat v-if="b.is_recurring" class="mr-0.5 inline size-3 align-[-1px] opacity-70" aria-label="Berulang mingguan" />{{ b.title }}
              </p>
              <p v-if="blockRows(b) >= 2" class="truncate text-[11px] opacity-80">
                {{ b.start_time }}–{{ b.end_time }} · {{ b.user?.name }}
              </p>
            </button>

            <!-- Garis waktu sekarang -->
            <div v-if="showNow(col)" class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-red-500" :style="{ top: `${nowTop}px` }">
              <span v-if="col.key === firstNowKey" class="absolute -left-1 -top-[3px] flex size-2">
                <span class="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span class="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
