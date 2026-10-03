<script setup>
import { AlertCircle, Clock, Info, Loader2, RotateCcw, Save, Settings2, Type } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import api, { errorMessage, validationErrors } from '@/lib/api'
import { formatDuration, minutesToTime, timeOptions, timeToMinutes } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const settings = useSettingsStore()
const ui = useUiStore()

const SLOT_CHOICES = [15, 30, 60]

const form = reactive({})
const saved = ref({}) // nilai terakhir yang tersimpan di server
const defaults = ref({})
const errors = ref({})
const loading = ref(true)
const saving = ref(false)

function fill(data) {
  saved.value = { ...data.values }
  defaults.value = data.defaults
  Object.assign(form, data.values)
}

onMounted(async () => {
  try {
    const { data } = await api.get('/settings/manage')
    fill(data)
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    loading.value = false
  }
})

const dirtyKeys = computed(() => Object.keys(saved.value).filter((k) => form[k] !== saved.value[k]))
const isDirty = computed(() => dirtyKeys.value.length > 0)
const isCustom = (key) => defaults.value[key] !== undefined && form[key] !== defaults.value[key]

// ---- Pilihan berdasarkan interval slot ----
const openMin = computed(() => (form.open_time ? timeToMinutes(form.open_time) : 0))
const closeMin = computed(() => (form.close_time ? timeToMinutes(form.close_time) : 0))
const dayTimes = computed(() => timeOptions('00:00', '23:59', form.slot_minutes || 30))
const durationOptions = (from, to) => {
  const list = []
  for (let m = form.slot_minutes; m <= to; m += form.slot_minutes) if (m >= from) list.push(m)
  return list
}
const minDurationOptions = computed(() => durationOptions(form.slot_minutes, Math.min(240, closeMin.value - openMin.value)))
const maxDurationOptions = computed(() => durationOptions(form.min_duration, closeMin.value - openMin.value))

/** Saat interval berubah, selaraskan nilai lain ke kelipatan terdekat agar tetap valid. */
watch(
  () => form.slot_minutes,
  (slot, old) => {
    if (!old || !slot) return
    const up = (m) => Math.ceil(m / slot) * slot
    const down = (m) => Math.floor(m / slot) * slot
    form.open_time = minutesToTime(up(openMin.value))
    form.close_time = minutesToTime(down(closeMin.value))
    form.min_duration = Math.max(slot, up(form.min_duration))
    form.max_duration = Math.max(form.min_duration, down(form.max_duration))
  },
)

// Ringkasan aturan dalam bahasa sehari-hari
const summary = computed(() => {
  if (!form.open_time) return ''
  return `Ruang rapat bisa dipesan pukul ${form.open_time}–${form.close_time} dengan interval ${form.slot_minutes} menit. `
    + `Durasi satu booking ${formatDuration(form.min_duration)} sampai ${formatDuration(form.max_duration)}. `
    + `User biasa bisa memesan hingga ${form.max_advance_days} hari ke depan, `
    + `dan booking berulang maksimal ${form.max_repeat_weeks} minggu.`
})

async function save() {
  saving.value = true
  errors.value = {}
  const payload = Object.fromEntries(dirtyKeys.value.map((k) => [k, form[k]]))
  try {
    const { data } = await api.put('/settings', payload)
    fill(data)
    settings.apply(data.values)
    ui.success('Pengaturan berhasil disimpan.')
  } catch (e) {
    errors.value = validationErrors(e)
    ui.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

function discard() {
  Object.assign(form, saved.value)
  errors.value = {}
}

function useDefault(key) {
  form[key] = defaults.value[key]
}

async function resetAll() {
  const ok = await ui.confirm({
    title: 'Kembalikan ke default',
    message: 'Semua pengaturan akan dikembalikan ke nilai default dari file .env server. Lanjutkan?',
    confirmText: 'Kembalikan',
    danger: true,
  })
  if (!ok) return
  try {
    const { data } = await api.delete('/settings')
    fill(data)
    settings.apply(data.values)
    ui.success('Pengaturan dikembalikan ke default.')
  } catch (e) {
    ui.error(errorMessage(e))
  }
}

onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true
  return ui.confirm({
    title: 'Perubahan belum disimpan',
    message: 'Ada pengaturan yang belum disimpan. Tinggalkan halaman ini dan buang perubahan?',
    confirmText: 'Tinggalkan',
    danger: true,
  })
})

const sections = [
  { key: 'identity', title: 'Identitas Aplikasi', icon: Type, description: 'Tampil di sidebar, halaman login, dan judul tab browser.' },
  { key: 'hours', title: 'Jam Operasional', icon: Clock, description: 'Rentang jam yang tampil di grid jadwal dan bisa dipesan.' },
  { key: 'rules', title: 'Aturan Booking', icon: Settings2, description: 'Batasan durasi dan seberapa jauh ke depan user bisa memesan.' },
]
</script>

<template>
  <div class="space-y-6 pb-24">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm text-slate-500">Hanya System Admin yang dapat mengubah pengaturan ini. Perubahan berlaku untuk semua pengguna.</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="resetAll">
        <RotateCcw class="size-4" /> Kembalikan semua ke default
      </button>
    </div>

    <div v-if="loading" class="grid gap-6 xl:grid-cols-3">
      <div v-for="n in 3" :key="n" class="skeleton h-72" />
    </div>

    <template v-else>
      <div class="flex animate-rise gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <Info class="mt-0.5 size-5 shrink-0 text-indigo-500" />
        <p>{{ summary }}</p>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section v-for="(sec, i) in sections" :key="sec.key" class="card animate-rise" :style="stagger(i + 1, 70)">
          <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <component :is="sec.icon" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-slate-900">{{ sec.title }}</h2>
              <p class="text-xs text-slate-500">{{ sec.description }}</p>
            </div>
          </header>

          <div class="space-y-5 p-5">
            <!-- Identitas -->
            <template v-if="sec.key === 'identity'">
              <div>
                <div class="flex items-center justify-between">
                  <label class="label" for="s-app-name">Nama aplikasi</label>
                  <button v-if="isCustom('app_name')" type="button" class="text-xs text-indigo-600 hover:underline" @click="useDefault('app_name')">↺ default</button>
                </div>
                <input id="s-app-name" v-model.trim="form.app_name" class="input" :class="{ 'input-error': errors.app_name }" maxlength="50" />
                <p v-if="errors.app_name" class="field-error">{{ errors.app_name }}</p>
                <p v-else class="mt-1 text-xs text-slate-400">Default: {{ defaults.app_name }}</p>
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <label class="label" for="s-app-subtitle">Subjudul</label>
                  <button v-if="isCustom('app_subtitle')" type="button" class="text-xs text-indigo-600 hover:underline" @click="useDefault('app_subtitle')">↺ default</button>
                </div>
                <input id="s-app-subtitle" v-model.trim="form.app_subtitle" class="input" maxlength="100" />
                <p class="mt-1 text-xs text-slate-400">Default: {{ defaults.app_subtitle }}</p>
              </div>
              <!-- Pratinjau -->
              <div class="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
                <div class="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                  {{ (form.app_name || '?').slice(0, 1).toUpperCase() }}
                </div>
                <div class="min-w-0 leading-tight">
                  <p class="truncate text-sm font-bold text-slate-900">{{ form.app_name || '—' }}</p>
                  <p class="truncate text-xs text-slate-500">{{ form.app_subtitle }}</p>
                </div>
                <span class="ml-auto text-[11px] text-slate-400">Pratinjau sidebar</span>
              </div>
            </template>

            <!-- Jam operasional -->
            <template v-else-if="sec.key === 'hours'">
              <div>
                <span class="label">Interval slot</span>
                <div class="inline-flex w-full rounded-lg border border-slate-300 p-0.5">
                  <button
                    v-for="m in SLOT_CHOICES"
                    :key="m"
                    type="button"
                    class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition"
                    :class="form.slot_minutes === m ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'"
                    @click="form.slot_minutes = m"
                  >
                    {{ m }} menit
                  </button>
                </div>
                <p v-if="errors.slot_minutes" class="field-error">{{ errors.slot_minutes }}</p>
                <p v-else class="mt-1 text-xs text-slate-400">
                  Jam booking mengikuti kelipatan ini (mis. 09:00, {{ minutesToTime(540 + form.slot_minutes) }}). Default: {{ defaults.slot_minutes }} menit
                </p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="s-open">Jam buka</label>
                  <select id="s-open" v-model="form.open_time" class="input" :class="{ 'input-error': errors.open_time }">
                    <option v-for="t in dayTimes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <p class="mt-1 text-xs text-slate-400">Default: {{ defaults.open_time }}</p>
                </div>
                <div>
                  <label class="label" for="s-close">Jam tutup</label>
                  <select id="s-close" v-model="form.close_time" class="input" :class="{ 'input-error': errors.close_time }">
                    <option v-for="t in dayTimes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <p class="mt-1 text-xs text-slate-400">Default: {{ defaults.close_time }}</p>
                </div>
              </div>
              <p v-if="errors.open_time || errors.close_time" class="field-error -mt-3">{{ errors.open_time || errors.close_time }}</p>

              <!-- Visual rentang jam operasional dalam 24 jam -->
              <div>
                <div class="relative h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="absolute inset-y-0 rounded-full bg-indigo-500 transition-all duration-300"
                    :style="{ left: `${(openMin / 1440) * 100}%`, width: `${(Math.max(closeMin - openMin, 0) / 1440) * 100}%` }"
                  />
                </div>
                <div class="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                </div>
              </div>
            </template>

            <!-- Aturan booking -->
            <template v-else>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="s-min">Durasi minimal</label>
                  <select id="s-min" v-model.number="form.min_duration" class="input" :class="{ 'input-error': errors.min_duration }">
                    <option v-for="m in minDurationOptions" :key="m" :value="m">{{ formatDuration(m) }}</option>
                  </select>
                  <p class="mt-1 text-xs text-slate-400">Default: {{ formatDuration(defaults.min_duration) }}</p>
                </div>
                <div>
                  <label class="label" for="s-max">Durasi maksimal</label>
                  <select id="s-max" v-model.number="form.max_duration" class="input" :class="{ 'input-error': errors.max_duration }">
                    <option v-for="m in maxDurationOptions" :key="m" :value="m">{{ formatDuration(m) }}</option>
                  </select>
                  <p class="mt-1 text-xs text-slate-400">Default: {{ formatDuration(defaults.max_duration) }}</p>
                </div>
              </div>
              <p v-if="errors.min_duration || errors.max_duration" class="field-error -mt-3">{{ errors.min_duration || errors.max_duration }}</p>

              <div>
                <label class="label" for="s-advance">Batas pemesanan ke depan (user biasa)</label>
                <div class="relative">
                  <input
                    id="s-advance"
                    v-model.number="form.max_advance_days"
                    type="number"
                    min="1"
                    max="365"
                    class="input pr-14"
                    :class="{ 'input-error': errors.max_advance_days }"
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">hari</span>
                </div>
                <p v-if="errors.max_advance_days" class="field-error">{{ errors.max_advance_days }}</p>
                <p v-else class="mt-1 text-xs text-slate-400">Admin & System Admin tidak dibatasi. Default: {{ defaults.max_advance_days }} hari</p>
              </div>

              <div>
                <label class="label" for="s-repeat">Maksimal booking berulang</label>
                <div class="relative">
                  <input
                    id="s-repeat"
                    v-model.number="form.max_repeat_weeks"
                    type="number"
                    min="1"
                    max="52"
                    class="input pr-20"
                    :class="{ 'input-error': errors.max_repeat_weeks }"
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">minggu</span>
                </div>
                <p v-if="errors.max_repeat_weeks" class="field-error">{{ errors.max_repeat_weeks }}</p>
                <p v-else class="mt-1 text-xs text-slate-400">Isi 1 untuk menonaktifkan booking berulang. Default: {{ defaults.max_repeat_weeks }} minggu</p>
              </div>
            </template>
          </div>
        </section>
      </div>
    </template>

    <!-- Bar simpan: muncul saat ada perubahan -->
    <Transition
      enter-from-class="translate-y-full opacity-0"
      enter-active-class="transition duration-300 ease-out"
      leave-to-class="translate-y-full opacity-0"
      leave-active-class="transition duration-200 ease-in"
    >
      <div v-if="isDirty" class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:left-64">
        <div class="flex flex-wrap items-center gap-3">
          <p class="flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle class="size-4" /> {{ dirtyKeys.length }} pengaturan belum disimpan
          </p>
          <div class="ml-auto flex gap-2">
            <button class="btn-secondary" :disabled="saving" @click="discard">Batal</button>
            <button class="btn-primary" :disabled="saving" @click="save">
              <Loader2 v-if="saving" class="size-4 animate-spin" />
              <Save v-else class="size-4" />
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
