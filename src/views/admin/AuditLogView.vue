<script setup>
import { ArrowRight, Search, UserRound, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import api, { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useUiStore } from '@/stores/ui'

/**
 * Audit log (Admin & System Admin): siapa melakukan apa, kapan, dan dari mana.
 */
const ui = useUiStore()

const CATEGORY_BADGE = {
  auth: 'bg-sky-50 text-sky-700',
  booking: 'bg-indigo-50 text-indigo-700',
  room: 'bg-emerald-50 text-emerald-700',
  user: 'bg-purple-50 text-purple-700',
  settings: 'bg-amber-50 text-amber-700',
  system: 'bg-slate-100 text-slate-600',
}
const FAILED = ['auth.login_failed']

const filters = reactive({ search: '', category: '', from: '', to: '' })
// Pelaku yang sedang dilihat: akun (id) atau pelaku tanpa akun ("Sistem", username login gagal).
const actor = ref(null) // { id, name, username } | { name }
const logs = ref([])
const meta = ref(null)
const categories = ref({})
const retentionDays = ref(null)
const loading = ref(false)
const hasFilter = computed(() => Object.values(filters).some(Boolean) || Boolean(actor.value))

async function load(page = 1) {
  loading.value = true
  try {
    const params = { page }
    for (const [key, value] of Object.entries(filters)) if (value) params[key] = value
    if (actor.value?.id) params.user_id = actor.value.id
    else if (actor.value) params.user_name = actor.value.name
    const { data } = await api.get('/audit-logs', { params })
    logs.value = data.data
    meta.value = data.meta
    categories.value = data.categories
    retentionDays.value = data.retention_days
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

let timer
watch(
  () => ({ ...filters }),
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => load(), 300)
  },
)
watch(actor, () => load())
onMounted(load)

function resetFilters() {
  Object.assign(filters, { search: '', category: '', from: '', to: '' })
  actor.value = null
}

/** Tampilkan seluruh aktivitas pelaku catatan ini. */
function showActor(log) {
  actor.value = log.user ? { ...log.user } : { name: log.user_name }
  detail.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const time = (iso) => iso.slice(11, 19)
const dateTime = (iso) => `${formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })} ${time(iso)}`
const show = (value) => (value === null || value === undefined || value === '' ? '—' : String(value))

const detail = ref(null)
</script>

<template>
  <div class="card overflow-hidden">
    <div class="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_10rem_auto] lg:items-end">
      <div class="relative sm:col-span-2 lg:col-span-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input v-model="filters.search" class="input pl-9" placeholder="Cari aktivitas, nama pengguna, atau IP…" aria-label="Cari" />
      </div>
      <select v-model="filters.category" class="input" aria-label="Jenis aktivitas">
        <option value="">Semua aktivitas</option>
        <option v-for="(label, key) in categories" :key="key" :value="key">{{ label }}</option>
      </select>
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Dari tanggal</span>
        <input v-model="filters.from" type="date" class="input" :max="filters.to || undefined" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Sampai tanggal</span>
        <input v-model="filters.to" type="date" class="input" :min="filters.from || undefined" />
      </label>
      <button v-if="hasFilter" class="btn-ghost justify-center" @click="resetFilters"><X class="size-4" /> Reset</button>
    </div>

    <!-- Sedang melihat aktivitas satu pengguna -->
    <div v-if="actor" class="flex flex-wrap items-center gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-3 sm:px-5">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600"><UserRound class="size-5" /></span>
      <p class="min-w-0 flex-1 text-sm text-indigo-900">
        Aktivitas <span class="font-semibold">{{ actor.name }}</span
        ><span v-if="actor.username" class="text-indigo-700"> @{{ actor.username }}</span
        ><span v-if="meta" class="text-indigo-700"> · {{ meta.total }} catatan</span>
      </p>
      <button class="btn-secondary btn-sm" @click="actor = null"><X class="size-4" /> Semua pengguna</button>
    </div>

    <ul v-if="logs.length" class="divide-y divide-slate-100">
      <li v-for="(log, i) in logs" :key="log.id" class="animate-rise" :style="stagger(i, 20)">
        <div
          role="button"
          tabindex="0"
          class="flex w-full min-w-0 cursor-pointer gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5"
          @click="detail = log"
          @keydown.enter="detail = log"
        >
          <span class="w-20 shrink-0 text-xs leading-5 text-slate-500 tabular-nums sm:w-24">
            <span class="block">{{ formatDate(log.created_at, { day: 'numeric', month: 'short' }) }}</span>
            <span class="block font-medium text-slate-700">{{ time(log.created_at) }}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="badge" :class="FAILED.includes(log.action) ? 'bg-red-50 text-red-700' : CATEGORY_BADGE[log.category]">
                {{ log.action_label }}
              </span>
              <button
                v-if="!actor"
                type="button"
                class="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                :title="`Lihat semua aktivitas ${log.user_name}`"
                @click.stop="showActor(log)"
              >
                {{ log.user_name }}
              </button>
              <span v-else class="text-sm font-medium text-slate-900">{{ log.user_name }}</span>
            </span>
            <span class="mt-0.5 block break-words text-sm text-slate-600 line-clamp-2">{{ log.description }}</span>
            <span v-if="log.changes.length" class="mt-0.5 block truncate text-xs text-slate-500">
              Diubah: {{ log.changes.map((c) => c.label).join(', ') }}
            </span>
          </span>
          <span class="hidden shrink-0 text-xs text-slate-400 tabular-nums md:block">{{ log.ip_address }}</span>
        </div>
      </li>
    </ul>
    <EmptyState
      v-else-if="!loading"
      title="Belum ada catatan"
      :description="hasFilter ? 'Tidak ada aktivitas yang cocok dengan filter.' : 'Aktivitas akan tercatat di sini.'"
    />
    <div v-else class="space-y-3 p-4">
      <div v-for="n in 6" :key="n" class="skeleton h-12" :style="{ opacity: 1 - n * 0.12 }" />
    </div>

    <PaginationBar :meta="meta" @change="load" />
    <p v-if="retentionDays" class="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
      Catatan disimpan {{ retentionDays }} hari, lalu dihapus otomatis.
    </p>

    <BaseModal v-if="detail" title="Detail Aktivitas" size="lg" @close="detail = null">
      <div class="space-y-5">
        <div>
          <span class="badge" :class="FAILED.includes(detail.action) ? 'bg-red-50 text-red-700' : CATEGORY_BADGE[detail.category]">
            {{ detail.category_label }} · {{ detail.action_label }}
          </span>
          <p class="mt-2 break-words text-slate-900">{{ detail.description }}</p>
        </div>

        <dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-slate-500">Waktu</dt>
            <dd class="font-medium text-slate-900 tabular-nums">{{ dateTime(detail.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Pengguna</dt>
            <dd class="font-medium text-slate-900">
              {{ detail.user_name }}
              <span v-if="detail.user" class="font-normal text-slate-500">@{{ detail.user.username }}</span>
            </dd>
            <button type="button" class="mt-0.5 text-xs font-medium text-indigo-600 hover:underline" @click="showActor(detail)">
              Lihat semua aktivitas pengguna ini →
            </button>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Alamat IP</dt>
            <dd class="text-slate-900 tabular-nums">{{ show(detail.ip_address) }}</dd>
          </div>
          <div v-for="(value, key) in detail.meta" :key="key">
            <dt class="text-xs text-slate-500">{{ key }}</dt>
            <dd class="break-words text-slate-900">{{ show(value) }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs text-slate-500">Perangkat / browser</dt>
            <dd class="break-all text-xs text-slate-600">{{ show(detail.user_agent) }}</dd>
          </div>
        </dl>

        <div v-if="detail.changes.length">
          <h3 class="mb-2 text-sm font-semibold text-slate-900">Perubahan</h3>
          <div class="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div
              v-for="c in detail.changes"
              :key="c.field"
              class="grid grid-cols-1 gap-1 px-3 py-2 text-sm sm:grid-cols-[10rem_1fr_auto_1fr] sm:items-center sm:gap-3"
            >
              <span class="text-xs font-medium text-slate-500">{{ c.label }}</span>
              <span class="break-words text-slate-500" :class="{ 'line-through decoration-red-300': c.old !== null && c.new !== null }">
                {{ show(c.old) }}
              </span>
              <ArrowRight class="hidden size-4 text-slate-300 sm:block" />
              <span class="break-words font-medium text-slate-900">{{ show(c.new) }}</span>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
