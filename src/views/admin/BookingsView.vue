<script setup>
import { CalendarClock, Clock, DoorOpen, PlayCircle, Repeat, Search, User, Users } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import LiveDot from '@/components/LiveDot.vue'
import api, { errorMessage } from '@/lib/api'
import { bookingType } from '@/lib/bookingTypes'
import { formatDate, formatDuration, nowMinutes, timeToMinutes, todayStr } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

/**
 * Pantauan admin: booking hari ini yang sedang berlangsung & akan datang.
 * Booking yang sudah selesai (atau dibatalkan) tidak ditampilkan; daftar diperbarui otomatis.
 */
const modal = useBookingModal()
const ui = useUiStore()

const bookings = ref([])
const rooms = ref([])
const loaded = ref(false)
const lastUpdated = ref(null)
const now = ref(nowMinutes())
const search = ref('')
const roomId = ref('')

async function load() {
  try {
    const { data } = await api.get('/bookings/today')
    bookings.value = [...data.ongoing, ...data.upcoming]
    lastUpdated.value = new Date()
    now.value = nowMinutes()
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    loaded.value = true
  }
}

let ticker
let refresher
onMounted(async () => {
  load()
  ticker = setInterval(() => (now.value = nowMinutes()), 15_000)
  refresher = setInterval(load, 60_000)
  try {
    rooms.value = (await api.get('/rooms')).data.data.filter((r) => r.is_active)
  } catch {
    // daftar ruangan hanya untuk filter; abaikan bila gagal
  }
})
onBeforeUnmount(() => {
  clearInterval(ticker)
  clearInterval(refresher)
})
watch(() => modal.version, load)

const startMin = (b) => timeToMinutes(b.start_time)
const endMin = (b) => timeToMinutes(b.end_time)

// Disaring ulang setiap "tick" agar booking yang baru selesai langsung hilang
// dan booking yang baru mulai pindah ke "Sedang Berlangsung" tanpa menunggu reload.
const visible = computed(() => {
  const term = search.value.trim().toLowerCase()
  return bookings.value.filter((b) => {
    if (b.date !== todayStr() || endMin(b) <= now.value) return false
    if (roomId.value && b.room_id !== roomId.value) return false
    if (!term) return true
    return [b.title, b.user?.name, b.room?.name, b.user?.department].some((v) => v?.toLowerCase().includes(term))
  })
})
const ongoing = computed(() => visible.value.filter((b) => startMin(b) <= now.value))
const upcoming = computed(() => visible.value.filter((b) => startMin(b) > now.value))
const roomsInUse = computed(() => new Set(ongoing.value.map((b) => b.room_id)).size)

const progress = (b) => Math.min(100, Math.max(0, ((now.value - startMin(b)) / (endMin(b) - startMin(b))) * 100))
const remaining = (b) => formatDuration(Math.max(endMin(b) - now.value, 0))
const startsIn = (b) => {
  const m = startMin(b) - now.value
  return m < 60 ? `dalam ${m} menit` : `dalam ${formatDuration(m)}`
}
const startsSoon = (b) => startMin(b) - now.value <= 15

const stats = computed(() => [
  { label: 'Sedang berlangsung', value: ongoing.value.length, icon: PlayCircle, cls: 'bg-emerald-50 text-emerald-600' },
  { label: 'Akan datang hari ini', value: upcoming.value.length, icon: CalendarClock, cls: 'bg-indigo-50 text-indigo-600' },
  {
    label: 'Ruangan terpakai sekarang',
    value: `${roomsInUse.value} / ${rooms.value.length || '-'}`,
    icon: DoorOpen,
    cls: 'bg-amber-50 text-amber-600',
  },
])

const updatedLabel = computed(() =>
  lastUpdated.value ? lastUpdated.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
)
</script>

<template>
  <div class="space-y-6">
    <!-- Judul & filter -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Booking Hari Ini</h2>
        <p class="flex items-center gap-2 text-sm text-slate-500">
          {{ formatDate(todayStr()) }}
          <span class="flex items-center gap-1.5 text-xs text-emerald-700"><LiveDot /> Diperbarui otomatis · {{ updatedLabel }}</span>
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row lg:ml-auto">
        <div class="relative sm:w-72">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input v-model="search" class="input pl-9" placeholder="Cari rapat, pemesan, atau ruangan…" />
        </div>
        <select v-model="roomId" class="input sm:w-56" aria-label="Ruangan">
          <option value="">Semua ruangan</option>
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} (Lt {{ r.floor }})</option>
        </select>
      </div>
    </div>

    <!-- Ringkasan -->
    <div class="grid gap-3 sm:grid-cols-3">
      <div v-for="(s, i) in stats" :key="s.label" class="card flex animate-rise items-center gap-3 p-4" :style="stagger(i, 60)">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg" :class="s.cls">
          <component :is="s.icon" class="size-5" />
        </div>
        <div>
          <p class="text-xl font-semibold tabular-nums text-slate-900">{{ loaded ? s.value : '–' }}</p>
          <p class="text-xs text-slate-500">{{ s.label }}</p>
        </div>
      </div>
    </div>

    <!-- Sedang berlangsung -->
    <section>
      <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <LiveDot color="red" /> Sedang Berlangsung
        <span class="badge bg-slate-100 text-slate-600">{{ ongoing.length }}</span>
      </h3>

      <div v-if="!loaded" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div v-for="n in 3" :key="n" class="skeleton h-48" />
      </div>
      <div v-else-if="!ongoing.length" class="card">
        <EmptyState title="Tidak ada rapat yang sedang berlangsung" description="Semua ruangan sedang kosong saat ini." />
      </div>
      <TransitionGroup
        v-else
        tag="div"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        enter-from-class="opacity-0 scale-95"
        enter-active-class="transition duration-300"
        leave-to-class="opacity-0 scale-95"
        leave-active-class="transition duration-300"
        move-class="transition duration-300"
      >
        <button
          v-for="(b, i) in ongoing"
          :key="b.id"
          type="button"
          class="card flex animate-rise flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lg"
          :style="stagger(i, 50)"
          @click="modal.show(b)"
        >
          <div class="h-1.5 w-full" :style="{ background: b.room.color }" />
          <div class="flex flex-1 flex-col gap-3 p-4">
            <div class="flex items-start justify-between gap-2">
              <p class="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-700">
                <span class="truncate">{{ b.room.name }}</span>
                <span class="badge shrink-0 bg-slate-100 text-[11px] text-slate-600">Lt {{ b.room.floor }}</span>
              </p>
              <span class="badge shrink-0 text-slate-800" :class="bookingType(b.type).swatch">{{ bookingType(b.type).label }}</span>
            </div>
            <p class="line-clamp-2 font-semibold text-slate-900">
              <Repeat v-if="b.is_recurring" class="mr-1 inline size-3.5 align-[-2px] text-indigo-500" />{{ b.title }}
            </p>
            <div class="mt-auto space-y-1.5">
              <div class="flex justify-between text-xs text-slate-500">
                <span class="flex items-center gap-1"><Clock class="size-3.5" /> {{ b.start_time }}–{{ b.end_time }}</span>
                <span class="font-medium text-emerald-700">Sisa {{ remaining(b) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-emerald-500 transition-[width] duration-700" :style="{ width: `${progress(b)}%` }" />
              </div>
            </div>
            <div class="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span class="flex min-w-0 items-center gap-1">
                <User class="size-3.5 shrink-0" />
                <span class="truncate">{{ b.user?.name }}<template v-if="b.user?.department"> · {{ b.user.department }}</template></span>
              </span>
              <span class="flex shrink-0 items-center gap-1"><Users class="size-3.5" /> {{ b.participants }}</span>
            </div>
          </div>
        </button>
      </TransitionGroup>
    </section>

    <!-- Akan datang hari ini -->
    <section>
      <h3 class="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <CalendarClock class="size-4 text-indigo-600" /> Akan Datang Hari Ini
        <span class="badge bg-slate-100 text-slate-600">{{ upcoming.length }}</span>
      </h3>

      <div class="card overflow-hidden">
        <div v-if="!loaded" class="space-y-3 p-4">
          <div v-for="n in 4" :key="n" class="skeleton h-12" :style="{ opacity: 1 - n * 0.15 }" />
        </div>
        <EmptyState v-else-if="!upcoming.length" title="Tidak ada booking lagi hari ini" />
        <TransitionGroup
          v-else
          tag="ul"
          class="divide-y divide-slate-100"
          enter-from-class="opacity-0"
          enter-active-class="transition duration-300"
          leave-to-class="opacity-0 -translate-x-4"
          leave-active-class="transition duration-300"
        >
          <li v-for="(b, i) in upcoming" :key="b.id" class="animate-rise" :style="stagger(i, 30)">
            <button
              type="button"
              class="grid w-full grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-slate-50 md:grid-cols-[6.5rem_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_5rem]"
              @click="modal.show(b)"
            >
              <div class="row-span-2 md:row-span-1">
                <p class="text-base font-semibold tabular-nums text-slate-900">{{ b.start_time }}</p>
                <p class="text-xs" :class="startsSoon(b) ? 'font-medium text-amber-600' : 'text-slate-500'">{{ startsIn(b) }}</p>
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900">
                  <Repeat v-if="b.is_recurring" class="mr-1 inline size-3.5 align-[-2px] text-indigo-500" />{{ b.title }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ b.start_time }}–{{ b.end_time }} ·
                  <span class="rounded px-1 py-px text-slate-800" :class="bookingType(b.type).swatch">{{ bookingType(b.type).label }}</span>
                </p>
              </div>
              <p class="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                <span class="size-2.5 shrink-0 rounded-full" :style="{ background: b.room.color }" />
                <span class="truncate">{{ b.room.name }}</span>
                <span class="badge shrink-0 bg-slate-100 text-[11px] text-slate-600">Lt {{ b.room.floor }}</span>
              </p>
              <p class="col-start-2 min-w-0 truncate text-sm text-slate-600 md:col-start-auto">
                {{ b.user?.name }}<span v-if="b.user?.department" class="text-slate-400"> · {{ b.user.department }}</span>
              </p>
              <p class="hidden items-center justify-end gap-1 text-sm text-slate-500 md:flex">
                <Users class="size-3.5" /> {{ b.participants }}
              </p>
            </button>
          </li>
        </TransitionGroup>
      </div>
    </section>
  </div>
</template>
