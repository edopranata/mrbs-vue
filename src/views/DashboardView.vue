<script setup>
import { Building2, CalendarCheck, CalendarClock, DoorOpen, Users } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CountUp from '@/components/CountUp.vue'
import EmptyState from '@/components/EmptyState.vue'
import LiveDot from '@/components/LiveDot.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import api, { errorMessage } from '@/lib/api'
import { formatDate, formatDateShort, nowMinutes, timeToMinutes, todayStr } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const modal = useBookingModal()
const ui = useUiStore()

const dashboard = ref(null)
const schedule = ref(null)
// Bar pemakaian dirender dari 0 dulu, lalu melebar ke nilai sebenarnya.
const barsReady = ref(false)

async function load() {
  try {
    const [d, s] = await Promise.all([api.get('/dashboard'), api.get('/schedule', { params: { date: todayStr() } })])
    dashboard.value = d.data
    schedule.value = s.data
    if (!barsReady.value) {
      await nextTick()
      requestAnimationFrame(() => (barsReady.value = true))
    }
  } catch (e) {
    ui.error(errorMessage(e))
  }
}

let refresher
onMounted(() => {
  load()
  refresher = setInterval(load, 60_000)
})
onBeforeUnmount(() => clearInterval(refresher))
watch(() => modal.version, load)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})

/** Status tiap ruangan saat ini: sedang dipakai / kosong + booking berikutnya. */
const roomStatus = computed(() => {
  const now = nowMinutes()
  const groups = {}
  for (const room of schedule.value?.rooms ?? []) {
    const current = room.bookings.find((b) => timeToMinutes(b.start_time) <= now && timeToMinutes(b.end_time) > now)
    const next = room.bookings.find((b) => timeToMinutes(b.start_time) > now)
    ;(groups[room.floor] ??= []).push({ ...room, current, next })
  }
  return Object.entries(groups).map(([floor, rooms]) => ({ floor, rooms }))
})

const stats = computed(() => {
  const s = dashboard.value?.stats
  const admin = dashboard.value?.admin
  return [
    { label: 'Ruangan dipakai sekarang', value: s?.rooms_in_use, suffix: s ? ` / ${s.rooms_total}` : '', icon: DoorOpen, cls: 'bg-emerald-50 text-emerald-600' },
    { label: 'Booking hari ini', value: s?.bookings_today, icon: CalendarCheck, cls: 'bg-indigo-50 text-indigo-600' },
    auth.isViewer
      ? { label: 'Booking sedang berlangsung', value: dashboard.value?.ongoing?.length, icon: CalendarClock, cls: 'bg-amber-50 text-amber-600' }
      : { label: 'Booking saya (mendatang)', value: s?.my_upcoming, icon: CalendarClock, cls: 'bg-amber-50 text-amber-600' },
    auth.isAdmin
      ? { label: 'User aktif', value: admin?.users_active, icon: Users, cls: 'bg-sky-50 text-sky-600' }
      : { label: 'Total ruang rapat', value: s?.rooms_total, icon: Building2, cls: 'bg-sky-50 text-sky-600' },
  ]
})

const maxUsage = computed(() => Math.max(1, ...(dashboard.value?.admin?.room_usage ?? []).map((r) => r.bookings_count)))
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">{{ greeting }}, {{ auth.user?.name?.split(' ')[0] }}</h2>
      <p class="text-sm text-slate-500">{{ formatDate(todayStr()) }}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="(s, i) in stats"
        :key="s.label"
        class="card group flex animate-rise items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
        :style="stagger(i, 60)"
      >
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110" :class="s.cls">
          <component :is="s.icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <p class="text-xl font-semibold text-slate-900">
            <template v-if="s.value != null"><CountUp :value="s.value" />{{ s.suffix }}</template>
            <span v-else class="skeleton inline-block h-6 w-10 align-middle" />
          </p>
          <p class="text-xs leading-tight text-slate-500">{{ s.label }}</p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <!-- Status ruangan -->
      <section class="card animate-rise" :class="auth.isViewer ? 'xl:col-span-3' : 'xl:col-span-2'" :style="stagger(4, 60)">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 class="font-semibold text-slate-900">Status Ruangan Saat Ini</h3>
          <RouterLink :to="{ name: 'schedule' }" class="text-sm font-medium text-indigo-600 hover:underline">Lihat jadwal →</RouterLink>
        </div>
        <div class="grid gap-5 p-5 2xl:grid-cols-2">
          <div v-for="(group, gi) in roomStatus" :key="group.floor" class="animate-rise" :style="stagger(gi + 5, 60)">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lantai {{ group.floor }}</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="room in group.rooms"
                :key="room.id"
                class="rounded-lg border p-3.5 transition-colors duration-500 hover:shadow-sm"
                :class="room.current ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/40'"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <span class="size-2.5 rounded-full" :style="{ background: room.color }" /> {{ room.name }}
                  </p>
                  <span class="badge" :class="room.current ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'">
                    <LiveDot v-if="room.current" color="red" />
                    {{ room.current ? 'Dipakai' : 'Kosong' }}
                  </span>
                </div>
                <!-- Struktur tetap (judul + 2 baris) agar semua kartu sama tinggi, "Dipakai" maupun "Kosong". -->
                <div class="mt-2 space-y-1 text-xs leading-5">
                  <button
                    v-if="room.current"
                    class="block w-full truncate text-left text-slate-600 hover:text-slate-900"
                    @click="modal.show(room.current)"
                  >
                    {{ room.current.start_time }}–{{ room.current.end_time }} · {{ room.current.title }}
                  </button>
                  <p class="truncate text-slate-500">
                    <template v-if="room.next">Berikutnya {{ room.next.start_time }}: {{ room.next.title }}</template>
                    <template v-else>Tidak ada booking lagi hari ini</template>
                  </p>
                  <template v-if="!room.current">
                    <button
                      v-if="!auth.isViewer"
                      class="block font-medium text-indigo-600 hover:underline"
                      @click="modal.create({ room_id: room.id })"
                    >
                      + Pesan ruangan ini
                    </button>
                    <!-- View Only: baris kosong pengganti tombol pesan -->
                    <p v-else aria-hidden="true">&nbsp;</p>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <template v-if="!schedule">
            <div v-for="n in 4" :key="n" class="space-y-2">
              <div class="skeleton h-3 w-16" />
              <div class="grid gap-3 sm:grid-cols-2"><div class="skeleton h-24" /><div class="skeleton h-24" /></div>
            </div>
          </template>
        </div>
      </section>

      <!-- Booking saya -->
      <section v-if="!auth.isViewer" class="card animate-rise self-start" :style="stagger(5, 60)">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 class="font-semibold text-slate-900">Booking Saya Berikutnya</h3>
          <RouterLink :to="{ name: 'my-bookings' }" class="text-sm font-medium text-indigo-600 hover:underline">Semua →</RouterLink>
        </div>
        <ul v-if="dashboard?.my_upcoming?.length" class="divide-y divide-slate-100">
          <li v-for="(b, i) in dashboard.my_upcoming" :key="b.id" class="animate-rise" :style="stagger(i + 6, 60)">
            <button class="flex w-full gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50" @click="modal.show(b)">
              <span class="mt-1 h-10 w-1 shrink-0 rounded-full" :style="{ background: b.room.color }" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-medium text-slate-900">{{ b.title }}</span>
                  <StatusBadge :booking="b" />
                </span>
                <span class="block text-xs text-slate-500">
                  {{ b.date === todayStr() ? 'Hari ini' : formatDateShort(b.date) }}, {{ b.start_time }}–{{ b.end_time }}
                </span>
                <span class="block text-xs text-slate-500">{{ b.room.name }} · Lt. {{ b.room.floor }}</span>
              </span>
            </button>
          </li>
        </ul>
        <EmptyState v-else-if="dashboard" title="Belum ada booking" description="Booking ruang rapat Anda akan tampil di sini.">
          <button class="btn-primary btn-sm" @click="modal.create()">Buat booking</button>
        </EmptyState>
      </section>
    </div>

    <!-- Statistik admin -->
    <section v-if="auth.isAdmin && dashboard?.admin" class="card animate-rise" :style="stagger(6, 60)">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <h3 class="font-semibold text-slate-900">Pemakaian Ruangan Bulan Ini</h3>
        <p class="text-sm text-slate-500">
          {{ dashboard.admin.bookings_this_month }} booking · {{ dashboard.admin.cancelled_this_month }} dibatalkan
        </p>
      </div>
      <div class="space-y-3 p-5">
        <div v-for="r in dashboard.admin.room_usage" :key="r.id" class="flex items-center gap-3 text-sm">
          <span class="w-40 shrink-0 truncate text-slate-700">{{ r.name }} <span class="text-slate-400">· Lt {{ r.floor }}</span></span>
          <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full transition-[width] duration-1000 ease-out"
              :style="{ width: barsReady ? `${(r.bookings_count / maxUsage) * 100}%` : '0%', background: r.color }"
            />
          </div>
          <span class="w-10 text-right font-medium text-slate-900"><CountUp :value="r.bookings_count" :duration="1000" /></span>
        </div>
      </div>
    </section>
  </div>
</template>
