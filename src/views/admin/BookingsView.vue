<script setup>
import { Loader2, Search } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import BookingTable from '@/components/BookingTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import api, { errorMessage } from '@/lib/api'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const modal = useBookingModal()
const ui = useUiStore()

const filters = reactive({ search: '', room_id: '', status: '', date_from: '', date_to: '' })
const rooms = ref([])
const bookings = ref([])
const meta = ref(null)
const loading = ref(false)

async function load(page = 1) {
  loading.value = true
  try {
    const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v !== ''))
    const { data } = await api.get('/bookings', { params })
    bookings.value = data.data
    meta.value = data.meta
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
watch(() => modal.version, () => load(meta.value?.current_page ?? 1))

onMounted(async () => {
  load()
  const { data } = await api.get('/rooms')
  rooms.value = data.data
})

function reset() {
  Object.assign(filters, { search: '', room_id: '', status: '', date_from: '', date_to: '' })
}
</script>

<template>
  <div class="card overflow-hidden">
    <div class="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div class="relative lg:col-span-2">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input v-model="filters.search" class="input pl-9" placeholder="Cari judul atau pemesan…" />
      </div>
      <select v-model="filters.room_id" class="input" aria-label="Ruangan">
        <option value="">Semua ruangan</option>
        <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} (Lt {{ r.floor }})</option>
      </select>
      <select v-model="filters.status" class="input" aria-label="Status">
        <option value="">Semua status</option>
        <option value="confirmed">Terkonfirmasi</option>
        <option value="cancelled">Dibatalkan</option>
      </select>
      <input v-model="filters.date_from" type="date" class="input" aria-label="Dari tanggal" />
      <input v-model="filters.date_to" type="date" class="input" aria-label="Sampai tanggal" />
    </div>
    <div class="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
      <span>{{ meta?.total ?? 0 }} booking ditemukan</span>
      <span class="flex items-center gap-2">
        <Loader2 v-if="loading" class="size-4 animate-spin" />
        <button class="font-medium text-indigo-600 hover:underline" @click="reset">Reset filter</button>
      </span>
    </div>

    <BookingTable v-if="bookings.length" :bookings="bookings" show-user />
    <EmptyState v-else-if="!loading" title="Tidak ada booking" description="Coba ubah filter pencarian." />
    <div v-else class="space-y-3 p-4">
      <div v-for="n in 5" :key="n" class="skeleton h-12" :style="{ opacity: 1 - n * 0.15 }" />
    </div>

    <PaginationBar :meta="meta" @change="load" />
  </div>
</template>
