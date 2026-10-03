<script setup>
import { ChevronLeft, ChevronRight, Info } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import MiniCalendar from '@/components/MiniCalendar.vue'
import MonthView from '@/components/MonthView.vue'
import TimeGrid from '@/components/TimeGrid.vue'
import api, { errorMessage } from '@/lib/api'
import { BOOKING_TYPES } from '@/lib/bookingTypes'
import {
  addDays,
  addMonths,
  calendarDays,
  formatDate,
  formatMonth,
  monthStart,
  startOfWeek,
  todayStr,
} from '@/lib/format'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const modal = useBookingModal()
const ui = useUiStore()

const VIEWS = [
  { key: 'day', label: 'Hari' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
]

const q = route.query
const view = ref(VIEWS.some((v) => v.key === q.view) ? q.view : 'day')
const date = ref(/^\d{4}-\d{2}-\d{2}$/.test(q.date ?? '') ? q.date : todayStr())
const roomId = ref(q.room ? Number(q.room) : null)
const calMonth = ref(monthStart(date.value)) // bulan pertama pada kalender kecil

const schedule = ref(null)
const loading = ref(false)

// Tampilan yang sedang dirender. Diperbarui setelah data baru selesai dimuat,
// sehingga animasi pergantian tidak sempat menampilkan grid kosong.
const shown = ref(null) // { view, date, from }
const transitionName = ref('zoom')
let pendingTransition = 'zoom'
let requestId = 0

// ---- Rentang data sesuai tampilan ----
const range = computed(() => {
  if (view.value === 'week') {
    const from = startOfWeek(date.value)
    return { from, to: addDays(from, 6) }
  }
  if (view.value === 'month') {
    const days = calendarDays(date.value)
    return { from: days[0], to: days[41] }
  }
  return { from: date.value, to: date.value }
})

async function load({ silent = false } = {}) {
  const id = ++requestId
  if (!silent) loading.value = true
  try {
    const { data } = await api.get('/schedule', { params: range.value })
    if (id !== requestId) return // sudah ada permintaan yang lebih baru
    schedule.value = data
    if (!silent || !shown.value) {
      transitionName.value = pendingTransition
      shown.value = { view: view.value, date: date.value, from: range.value.from }
    }
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    if (id === requestId) loading.value = false
  }
}

const rooms = computed(() => schedule.value?.rooms ?? [])
const selectedRoom = computed(() => rooms.value.find((r) => r.id === roomId.value) ?? rooms.value[0])

/** Booking dari jadwal tidak memuat relasi ruangan; tempelkan dari induknya. */
const withRoom = (room) =>
  room.bookings.map((b) => ({
    ...b,
    room: { id: room.id, code: room.code, name: room.name, floor: room.floor, color: room.color },
  }))

const columns = computed(() => {
  if (!shown.value) return []
  const { view: shownView, date: shownDate, from } = shown.value
  if (shownView === 'week') {
    const room = selectedRoom.value
    if (!room) return []
    const bookings = withRoom(room)
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(from, i)
      return {
        key: day,
        label: formatDate(day, { weekday: 'long' }),
        sublabel: formatDate(day, { day: 'numeric', month: 'short' }),
        highlight: day === todayStr(),
        date: day,
        room,
        bookings: bookings.filter((b) => b.date === day),
      }
    })
  }
  return rooms.value.map((room) => ({
    key: room.id,
    label: room.name,
    sublabel: `[Lt ${room.floor}] (${room.capacity})`,
    date: shownDate,
    room,
    bookings: withRoom(room).filter((b) => b.date === shownDate),
  }))
})

const monthBookings = computed(() =>
  rooms.value.filter((r) => !roomId.value || r.id === roomId.value).flatMap(withRoom),
)

const title = computed(() => {
  if (view.value === 'week') {
    const { from, to } = range.value
    return `${formatDate(from, { day: 'numeric', month: 'short' })} – ${formatDate(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  if (view.value === 'month') return formatMonth(date.value)
  return formatDate(date.value)
})

/** Kunci grid: berubah = grid lama dianimasikan keluar, grid baru masuk. */
const gridKey = computed(() => {
  if (!shown.value) return null
  const { view: v, from } = shown.value
  return v === 'day' ? `${v}|${from}` : `${v}|${from}|${roomId.value ?? 'all'}`
})

const viewIndex = computed(() => VIEWS.findIndex((v) => v.key === view.value))

// ---- Navigasi ----
function shift(direction) {
  if (view.value === 'month') date.value = addMonths(date.value, direction)
  else date.value = addDays(date.value, direction * (view.value === 'week' ? 7 : 1))
}

function pickDate(day, toView = null) {
  date.value = day
  if (toView) view.value = toView
}

// Arah animasi: maju = geser dari kanan, mundur = dari kiri, ganti tampilan/ruangan = zoom.
watch(date, (to, from) => (pendingTransition = to > from ? 'slide-next' : 'slide-prev'))
watch(view, () => (pendingTransition = 'zoom'))
watch(roomId, () => (transitionName.value = 'zoom'))

// Tampilan minggu selalu untuk satu ruangan; default ruangan pertama.
watch([view, rooms], () => {
  if (view.value === 'week' && !roomId.value && rooms.value.length) roomId.value = rooms.value[0].id
})

// Kalender kecil mengikuti tanggal terpilih bila keluar dari 2 bulan yang tampil.
watch(date, (d) => {
  const m = monthStart(d)
  if (m !== calMonth.value && m !== addMonths(calMonth.value, 1)) calMonth.value = m
})

watch([view, date, roomId], () => {
  router.replace({
    query: { view: view.value, date: date.value, room: view.value !== 'day' && roomId.value ? roomId.value : undefined },
  })
})
watch(range, () => load(), { deep: true })
watch(() => modal.version, () => load({ silent: true }))

let refresher
onMounted(() => {
  load()
  refresher = setInterval(() => load({ silent: true }), 60_000)
})
onBeforeUnmount(() => clearInterval(refresher))

function selectSlot({ room, date: day, start_time, end_time }) {
  modal.create({ room_id: room.id, date: day, start_time, end_time })
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[15rem_1fr]">
    <!-- Kalender kecil -->
    <!-- Menempel di bawah header aplikasi saat halaman di-scroll; bila layar terlalu pendek
         untuk dua kalender, area ini bisa di-scroll sendiri. -->
    <aside class="hidden space-y-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-1">
      <MiniCalendar
        v-for="offset in [0, 1]"
        :key="offset"
        :month="addMonths(calMonth, offset)"
        :selected="date"
        :highlight-week="view === 'week'"
        @select="pickDate"
        @prev="calMonth = addMonths(calMonth, -1)"
        @next="calMonth = addMonths(calMonth, 1)"
      />
    </aside>

    <div class="min-w-0 space-y-3">

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center">
          <button class="btn-secondary rounded-r-none p-2" aria-label="Sebelumnya" @click="shift(-1)">
            <ChevronLeft class="size-4" />
          </button>
          <button class="btn-secondary rounded-none border-x-0" @click="date = todayStr()">Hari ini</button>
          <button class="btn-secondary rounded-l-none p-2" aria-label="Berikutnya" @click="shift(1)">
            <ChevronRight class="size-4" />
          </button>
        </div>
        <Transition name="fade" mode="out-in">
        <h2 :key="title" class="text-center text-lg font-semibold capitalize text-slate-900">{{ title }}</h2>
      </Transition>
        <input v-model="date" type="date" class="input w-auto lg:hidden" aria-label="Pilih tanggal" />

        <select v-if="view === 'week'" v-model="roomId" class="input w-auto" aria-label="Ruangan">
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} [Lt {{ r.floor }}]</option>
        </select>
        <select v-else-if="view === 'month'" v-model="roomId" class="input w-auto" aria-label="Ruangan">
          <option :value="null">Semua ruangan</option>
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} [Lt {{ r.floor }}]</option>
        </select>


        <div class="relative ml-auto inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
          <!-- Indikator yang meluncur ke tampilan aktif -->
          <span
            class="absolute inset-y-0.5 left-0.5 w-20 rounded-md bg-indigo-600 shadow transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(${viewIndex * 100}%)` }"
          />
          <button
            v-for="v in VIEWS"
            :key="v.key"
            class="relative w-20 rounded-md py-1.5 text-sm font-medium transition-colors duration-300"
            :class="view === v.key ? 'text-white' : 'text-slate-600 hover:text-slate-900'"
            @click="view = v.key"
          >
            {{ v.label }}
          </button>
        </div>
      </div>

      <!-- overflow-clip (bukan hidden) agar header grid tetap bisa menempel saat halaman di-scroll -->
      <div class="card relative overflow-clip">
        <!-- Garis progres tipis saat memuat tanggal lain -->
        <div v-if="loading && shown" class="absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-indigo-100">
          <div class="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-indigo-500" />
        </div>

        <Transition :name="transitionName" mode="out-in">
          <div v-if="shown" :key="gridKey">
            <MonthView
              v-if="shown.view === 'month'"
              :month="shown.date"
              :selected="date"
              :bookings="monthBookings"
              @pick-date="pickDate($event, 'day')"
              @open="modal.show"
            />
            <TimeGrid
              v-else-if="columns.length"
              :columns="columns"
              :open-time="schedule.open_time"
              :close-time="schedule.close_time"
              @select="selectSlot"
              @open="modal.show"
            />
            <EmptyState v-else title="Tidak ada ruangan aktif" />
          </div>

          <!-- Skeleton saat pertama kali memuat -->
          <div v-else class="space-y-2 p-4">
            <div class="flex gap-2">
              <div class="skeleton h-10 w-14" />
              <div v-for="n in 7" :key="n" class="skeleton h-10 flex-1" />
            </div>
            <div v-for="n in 10" :key="n" class="flex gap-2">
              <div class="skeleton h-6 w-14" />
              <div class="skeleton h-6 flex-1" :style="{ opacity: 1 - n * 0.07 }" />
            </div>
          </div>
        </Transition>
      </div>

      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span v-for="(t, key) in BOOKING_TYPES" :key="key" class="flex items-center gap-1.5">
          <span class="h-3.5 w-8 rounded-sm" :class="t.swatch" /> {{ t.label }}
        </span>
        <span class="flex items-center gap-1.5"><span class="size-3.5 rounded-sm ring-2 ring-inset ring-indigo-500" /> Booking Anda</span>
        <span class="flex items-center gap-1.5 text-slate-500">
          <Info class="size-4" />
          <template v-if="view === 'month'">Klik tanggal untuk melihat jadwal harian.</template>
          <template v-else>Klik slot kosong, atau seret beberapa slot, untuk membuat booking.</template>
        </span>
      </div>
    </div>
  </div>
</template>
