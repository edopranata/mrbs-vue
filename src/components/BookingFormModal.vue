<script setup>
import { AlertCircle, CheckCircle2, Loader2, Monitor, Repeat, Users, XCircle } from 'lucide-vue-next'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import api, { errorMessage, validationErrors } from '@/lib/api'
import { BOOKING_TYPES } from '@/lib/bookingTypes'
import {
  addDays,
  formatDate,
  formatDateShort,
  formatDuration,
  minutesToTime,
  nowMinutes,
  timeOptions,
  timeToMinutes,
  todayStr,
} from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const modal = useBookingModal()
const settings = useSettingsStore()
const auth = useAuthStore()
const ui = useUiStore()

const editing = modal.editing
const openMin = computed(() => timeToMinutes(settings.open_time))
const closeMin = computed(() => timeToMinutes(settings.close_time))

/** Slot 30 menit berikutnya dari sekarang (untuk default booking hari ini). */
function initialSlot() {
  const next = Math.ceil((nowMinutes() + 1) / 30) * 30
  if (next + 30 > closeMin.value) return { date: addDays(todayStr(), 1), start: '09:00' }
  return { date: todayStr(), start: minutesToTime(Math.max(next, openMin.value)) }
}

const slot = initialSlot()
const requestedDate = modal.defaults.date && modal.defaults.date >= todayStr() ? modal.defaults.date : null
const baseDate = editing?.date ?? requestedDate ?? slot.date
const form = reactive({
  title: editing?.title ?? '',
  description: editing?.description ?? '',
  room_id: editing?.room_id ?? modal.defaults.room_id ?? null,
  date: baseDate,
  start_time: editing?.start_time ?? modal.defaults.start_time ?? (baseDate === slot.date ? slot.start : '09:00'),
  end_time: editing?.end_time ?? modal.defaults.end_time ?? null,
  participants: editing?.participants ?? 2,
  type: editing?.type ?? 'internal',
})
if (!form.end_time) {
  form.end_time = minutesToTime(Math.min(timeToMinutes(form.start_time) + 60, closeMin.value))
}

// ---- Booking berulang mingguan (hanya saat membuat booking baru) ----
const repeat = reactive({ enabled: false, weeks: 4, skipConflicts: false })
const repeatWeeks = computed(() => (repeat.enabled && !editing ? repeat.weeks : 1))
const weekOptions = computed(() => Array.from({ length: Math.max(settings.max_repeat_weeks - 1, 0) }, (_, i) => i + 2))
watch(weekOptions, (options) => {
  if (options.length && !options.includes(repeat.weeks)) repeat.weeks = options.at(-1)
}, { immediate: true })
const lastDate = computed(() => addDays(form.date, 7 * (repeatWeeks.value - 1)))
const occurrences = ref([])
const loadingOccurrences = ref(false)
const blockedDates = computed(() => occurrences.value.filter((o) => !o.available))

const dialog = ref(null)
const errors = ref({})
const formError = ref('')
const saving = ref(false)
const rooms = ref([])
const checking = ref(false)

const isToday = computed(() => form.date === todayStr())
const minDate = todayStr()
const maxDate = computed(() => (auth.isAdmin ? undefined : addDays(todayStr(), settings.max_advance_days)))

/** Sisipkan jam booking lama yang belum selaras interval agar tidak berubah diam-diam saat diedit. */
const withLegacy = (options, time) => (time && !options.includes(time) ? [...options, time].sort() : options)

const startOptions = computed(() =>
  withLegacy(
    timeOptions(settings.open_time, minutesToTime(closeMin.value - settings.min_duration), settings.slot_minutes),
    editing?.start_time,
  ).filter((t) => !isToday.value || timeToMinutes(t) >= nowMinutes() || t === editing?.start_time),
)
const endOptions = computed(() => {
  const start = timeToMinutes(form.start_time)
  return withLegacy(timeOptions(settings.open_time, settings.close_time, settings.slot_minutes), editing?.end_time).filter(
    (t) => {
      const m = timeToMinutes(t)
      return m >= start + settings.min_duration && m <= start + settings.max_duration
    },
  )
})
const duration = computed(() => timeToMinutes(form.end_time) - timeToMinutes(form.start_time))

// Mis. tanggal diganti ke hari ini: jam mulai yang sudah lewat tidak valid lagi.
watch(startOptions, (options) => {
  if (options.length && !options.includes(form.start_time)) form.start_time = options[0]
})

watch(
  () => form.start_time,
  () => {
    if (!endOptions.value.includes(form.end_time)) {
      const target = minutesToTime(Math.min(timeToMinutes(form.start_time) + 60, closeMin.value))
      form.end_time = endOptions.value.includes(target) ? target : endOptions.value[0]
    }
  },
)

const roomsByFloor = computed(() => {
  const groups = {}
  for (const room of rooms.value) (groups[room.floor] ??= []).push(room)
  return Object.entries(groups).map(([floor, list]) => ({ floor, rooms: list }))
})
const selectedRoom = computed(() => rooms.value.find((r) => r.id === form.room_id))

let timer
async function checkAvailability() {
  if (!form.date || !form.start_time || !form.end_time || duration.value <= 0) return
  checking.value = true
  try {
    const { data } = await api.get('/rooms/availability', {
      params: {
        start_at: `${form.date} ${form.start_time}`,
        end_at: `${form.date} ${form.end_time}`,
        participants: Number(form.participants) || 1,
        ignore_booking_id: editing?.id,
        repeat_weeks: repeatWeeks.value,
      },
    })
    rooms.value = data.data
  } catch (e) {
    formError.value = errorMessage(e)
  } finally {
    checking.value = false
  }
}
watch(
  () => [form.date, form.start_time, form.end_time, form.participants, repeatWeeks.value],
  () => {
    clearTimeout(timer)
    timer = setTimeout(checkAvailability, 250)
  },
  { immediate: true },
)

/** Status tiap tanggal untuk ruangan terpilih (bentrok, melewati batas hari, dsb). */
let occurrenceTimer
let occurrenceRequest = 0
async function loadOccurrences() {
  if (repeatWeeks.value < 2 || !form.room_id || duration.value <= 0) {
    occurrences.value = []
    return
  }
  const id = ++occurrenceRequest
  loadingOccurrences.value = true
  try {
    const { data } = await api.get('/bookings/occurrences', {
      params: {
        room_id: form.room_id,
        start_at: `${form.date} ${form.start_time}`,
        end_at: `${form.date} ${form.end_time}`,
        repeat_weeks: repeatWeeks.value,
        participants: Number(form.participants) || 1,
      },
    })
    if (id === occurrenceRequest) occurrences.value = data.data
  } catch (e) {
    formError.value = errorMessage(e)
  } finally {
    if (id === occurrenceRequest) loadingOccurrences.value = false
  }
}
watch(
  () => [form.room_id, form.date, form.start_time, form.end_time, form.participants, repeatWeeks.value],
  () => {
    clearTimeout(occurrenceTimer)
    occurrenceTimer = setTimeout(loadOccurrences, 250)
  },
)
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(occurrenceTimer)
})

/**
 * Ruangan boleh dipilih bila tersedia di semua minggu, atau (saat berulang) cukup kapasitas
 * dan masih ada minggu yang kosong; minggu yang bentrok nanti bisa dilewati.
 */
function selectable(room) {
  if (room.available) return true
  return repeatWeeks.value > 1 && room.fits_capacity && room.conflict_dates.length < repeatWeeks.value
}

async function submit() {
  errors.value = {}
  formError.value = ''
  saving.value = true

  const payload = {
    title: form.title,
    description: form.description || null,
    room_id: form.room_id,
    participants: Number(form.participants) || 1,
    type: form.type,
    start_at: `${form.date} ${form.start_time}`,
    end_at: `${form.date} ${form.end_time}`,
  }
  if (repeatWeeks.value > 1) {
    payload.repeat_weeks = repeatWeeks.value
    payload.skip_conflicts = repeat.skipConflicts
  }

  try {
    if (editing) {
      await api.put(`/bookings/${editing.id}`, payload)
      ui.success('Booking berhasil diperbarui.')
    } else if (payload.repeat_weeks) {
      const { data } = await api.post('/bookings', payload)
      const skipped = data.skipped?.length ? `, ${data.skipped.length} tanggal dilewati` : ''
      ui.success(`${data.data.length} booking mingguan berhasil dibuat${skipped}.`)
    } else {
      await api.post('/bookings', payload)
      ui.success('Booking berhasil dibuat.')
    }
    modal.changed()
    dialog.value.close()
  } catch (e) {
    errors.value = validationErrors(e)
    formError.value = errorMessage(e)
    if (errors.value.start_at || errors.value.end_at || errors.value.repeat_weeks) {
      checkAvailability()
      loadOccurrences()
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal ref="dialog" :title="editing ? 'Ubah Booking' : 'Buat Booking Baru'" size="lg" @close="modal.closeForm()">
    <form id="booking-form" class="space-y-5" @submit.prevent="submit">
      <Transition name="fade">
        <div v-if="formError" :key="formError" class="flex animate-shake gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle class="mt-0.5 size-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>
      </Transition>

      <div>
        <label class="label" for="title">Judul rapat</label>
        <input
          id="title"
          v-model="form.title"
          class="input"
          :class="{ 'input-error': errors.title }"
          placeholder="mis. Rapat Koordinasi Mingguan"
          required
          autofocus
        />
        <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="col-span-2">
          <label class="label" for="date">Tanggal</label>
          <input id="date" v-model="form.date" type="date" class="input" :min="minDate" :max="maxDate" required />
        </div>
        <div>
          <label class="label" for="start">Mulai</label>
          <select id="start" v-model="form.start_time" class="input" :class="{ 'input-error': errors.start_at }">
            <option v-for="t in startOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label" for="end">Selesai</label>
          <select id="end" v-model="form.end_time" class="input" :class="{ 'input-error': errors.end_at }">
            <option v-for="t in endOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <p class="col-span-2 -mt-1 text-xs text-slate-500 sm:col-span-4">
          <template v-if="!startOptions.length">Jam operasional hari ini sudah lewat, silakan pilih tanggal lain.</template>
          <template v-else-if="duration > 0">
            Durasi {{ formatDuration(duration) }} · Jam operasional {{ settings.open_time }}–{{ settings.close_time }}
          </template>
        </p>
        <p v-if="errors.start_at || errors.end_at" class="field-error col-span-2 -mt-2 sm:col-span-4">
          {{ errors.start_at || errors.end_at }}
        </p>
      </div>

      <div
        v-if="!editing && settings.max_repeat_weeks > 1"
        class="rounded-lg border p-3 transition-colors"
        :class="repeat.enabled ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200'"
      >
        <label class="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="switch"
            :aria-checked="repeat.enabled"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="repeat.enabled ? 'bg-indigo-600' : 'bg-slate-300'"
            @click="repeat.enabled = !repeat.enabled"
          >
            <span
              class="inline-block size-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="repeat.enabled ? 'translate-x-5.5' : 'translate-x-0.5'"
            />
          </button>
          <span class="min-w-0">
            <span class="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Repeat class="size-4 text-indigo-600" /> Ulangi setiap minggu
            </span>
            <span class="block text-xs text-slate-500">
              Setiap {{ formatDate(form.date, { weekday: 'long' }) }}, {{ form.start_time }}–{{ form.end_time }}
            </span>
          </span>
        </label>

        <Transition name="fade">
          <div v-if="repeat.enabled" class="mt-3 space-y-3 border-t border-indigo-100 pt-3">
            <div class="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span>Selama</span>
              <select v-model.number="repeat.weeks" class="input w-auto py-1.5" aria-label="Jumlah minggu">
                <option v-for="w in weekOptions" :key="w" :value="w">{{ w }} minggu</option>
              </select>
              <span class="text-slate-500">· sampai {{ formatDateShort(lastDate) }}</span>
            </div>

            <div v-if="!form.room_id" class="text-xs text-slate-500">Pilih ruangan untuk melihat ketersediaan tiap tanggal.</div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="(o, i) in occurrences"
                :key="o.date"
                class="badge animate-rise border"
                :class="o.available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700 line-through decoration-red-400'"
                :style="{ animationDelay: `${i * 30}ms` }"
                :title="o.reason ?? 'Tersedia'"
              >
                <CheckCircle2 v-if="o.available" class="size-3" />
                <XCircle v-else class="size-3" />
                {{ formatDate(o.date, { day: 'numeric', month: 'short' }) }}
              </span>
              <Loader2 v-if="loadingOccurrences" class="size-4 animate-spin self-center text-slate-400" />
            </div>

            <Transition name="fade">
              <div v-if="blockedDates.length" class="space-y-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800">
                <p v-for="o in blockedDates.slice(0, 3)" :key="o.date">
                  <span class="font-semibold">{{ formatDateShort(o.date) }}:</span> {{ o.reason }}
                </p>
                <p v-if="blockedDates.length > 3">dan {{ blockedDates.length - 3 }} tanggal lainnya.</p>
                <label class="flex items-center gap-2 pt-1 font-medium text-amber-900">
                  <input v-model="repeat.skipConflicts" type="checkbox" class="size-4 rounded border-amber-400 text-indigo-600" />
                  Lewati tanggal yang bentrok ({{ blockedDates.length }} dari {{ occurrences.length }})
                </label>
              </div>
            </Transition>
            <p v-if="errors.repeat_weeks" class="field-error">{{ errors.repeat_weeks }}</p>
          </div>
        </Transition>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <span class="label">Jenis rapat</span>
          <div class="inline-flex w-full rounded-lg border border-slate-300 p-0.5">
            <label
              v-for="(t, key) in BOOKING_TYPES"
              :key="key"
              class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition"
              :class="form.type === key ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'"
            >
              <input v-model="form.type" type="radio" name="type" :value="key" class="sr-only" />
              <span class="size-2.5 rounded-sm" :class="t.swatch" /> {{ t.label }}
            </label>
          </div>
        </div>
        <div>
          <label class="label" for="participants">Jumlah peserta</label>
          <input
            id="participants"
            v-model.number="form.participants"
            type="number"
            min="1"
            class="input"
            :class="{ 'input-error': errors.participants }"
          />
          <p v-if="errors.participants" class="field-error">{{ errors.participants }}</p>
        </div>
      </div>

      <div>
        <div class="mb-2 flex items-center gap-2">
          <span class="label mb-0">Pilih ruangan</span>
          <Loader2 v-if="checking" class="size-4 animate-spin text-slate-400" />
        </div>
        <div class="space-y-3">
          <div v-for="group in roomsByFloor" :key="group.floor">
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Lantai {{ group.floor }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="room in group.rooms"
                :key="room.id"
                class="flex h-full cursor-pointer gap-3 rounded-lg border p-3 transition"
                :class="[
                  form.room_id === room.id
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-slate-300',
                  !selectable(room) && form.room_id !== room.id ? 'cursor-not-allowed opacity-60' : '',
                ]"
              >
                <input
                  v-model="form.room_id"
                  type="radio"
                  name="room"
                  class="sr-only"
                  :value="room.id"
                  :disabled="!selectable(room) && form.room_id !== room.id"
                />
                <span class="mt-1 size-3 shrink-0 rounded-full" :style="{ background: room.color }" />
                <span class="min-w-0 flex-1">
                  <span class="flex items-center justify-between gap-2">
                    <span class="flex min-w-0 items-center gap-1.5">
                      <span class="truncate text-sm font-medium text-slate-900">{{ room.name }}</span>
                      <span class="badge shrink-0 bg-slate-100 text-[11px] text-slate-600">Lt {{ room.floor }}</span>
                    </span>
                    <span class="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                      <Users class="size-3.5" /> {{ room.capacity }}
                    </span>
                  </span>
                  <span v-if="room.available" class="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 class="size-3.5" /> Tersedia
                  </span>
                  <span
                    v-else-if="repeatWeeks > 1 && room.conflict_dates.length && room.fits_capacity"
                    class="mt-0.5 flex items-start gap-1 text-xs"
                    :class="selectable(room) ? 'text-amber-600' : 'text-red-600'"
                    :title="room.conflict_dates.map((d) => formatDateShort(d)).join(', ')"
                  >
                    <AlertCircle class="mt-px size-3.5 shrink-0" />
                    <span class="truncate">Bentrok {{ room.conflict_dates.length }} dari {{ repeatWeeks }} minggu</span>
                  </span>
                  <span v-else-if="room.conflicts.length" class="mt-0.5 flex items-start gap-1 text-xs text-red-600">
                    <XCircle class="mt-px size-3.5 shrink-0" />
                    <span class="truncate">
                      Terpakai {{ room.conflicts[0].start_time }}–{{ room.conflicts[0].end_time }}:
                      {{ room.conflicts[0].title }}
                    </span>
                  </span>
                  <span v-else class="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle class="size-3.5" /> Kapasitas tidak cukup
                  </span>
                  <!-- Fasilitas: selalu 2 baris agar semua kartu ruangan sama tinggi -->
                  <span
                    class="mt-1.5 flex h-8 items-start gap-1 text-xs leading-4 text-slate-500"
                    :title="room.facilities?.length ? `Fasilitas: ${room.facilities.join(', ')}` : undefined"
                  >
                    <Monitor class="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    <span class="line-clamp-2">
                      <template v-if="room.facilities?.length">{{ room.facilities.join(' · ') }}</template>
                      <span v-else class="italic text-slate-400">Fasilitas belum diisi</span>
                    </span>
                  </span>
                </span>
              </label>
            </div>
          </div>
          <p v-if="!rooms.length && !checking" class="text-sm text-slate-500">Memuat daftar ruangan…</p>
        </div>
        <p v-if="errors.room_id" class="field-error">{{ errors.room_id }}</p>
      </div>

      <div>
        <label class="label" for="description">Catatan / agenda <span class="font-normal text-slate-400">(opsional)</span></label>
        <textarea
          id="description"
          v-model="form.description"
          rows="3"
          class="input"
          placeholder="Agenda rapat, kebutuhan konsumsi, dsb."
        />
      </div>
    </form>

    <template #footer="{ close }">
      <p v-if="selectedRoom" class="mr-auto self-center text-sm text-slate-500">
        {{ selectedRoom.name }} (Lt {{ selectedRoom.floor }}) · {{ form.start_time }}–{{ form.end_time }}
        <span v-if="repeatWeeks > 1" class="font-medium text-indigo-600">· {{ repeatWeeks }}× mingguan</span>
      </p>
      <button type="button" class="btn-secondary" @click="close">Batal</button>
      <button type="submit" form="booking-form" class="btn-primary" :disabled="saving || !form.room_id || !form.title">
        <Loader2 v-if="saving" class="size-4 animate-spin" />
        {{ editing ? 'Simpan Perubahan' : 'Buat Booking' }}
      </button>
    </template>
  </BaseModal>
</template>
