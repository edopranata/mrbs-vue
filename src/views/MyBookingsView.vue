<script setup>
import { Loader2 } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import BookingTable from '@/components/BookingTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import api, { errorMessage } from '@/lib/api'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const modal = useBookingModal()
const ui = useUiStore()

const tabs = [
  { key: 'upcoming', label: 'Mendatang', params: { period: 'upcoming', status: 'confirmed' } },
  { key: 'past', label: 'Riwayat', params: { period: 'past', status: 'confirmed' } },
  { key: 'cancelled', label: 'Dibatalkan', params: { status: 'cancelled' } },
]
const tab = ref('upcoming')
const bookings = ref([])
const meta = ref(null)
const loading = ref(false)

async function load(page = 1) {
  loading.value = true
  try {
    const params = { mine: 1, page, ...tabs.find((t) => t.key === tab.value).params }
    const { data } = await api.get('/bookings', { params })
    bookings.value = data.data
    meta.value = data.meta
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

watch(tab, () => load())
watch(() => modal.version, () => load(meta.value?.current_page ?? 1))
onMounted(load)
</script>

<template>
  <div class="card overflow-hidden">
    <div class="flex items-center gap-1 border-b border-slate-200 px-3 pt-2">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200"
        :class="tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
      <Loader2 v-if="loading" class="ml-auto mr-2 size-4 animate-spin text-slate-400" />
    </div>

    <BookingTable v-if="bookings.length" :bookings="bookings" />
    <EmptyState
      v-else-if="!loading"
      :title="tab === 'upcoming' ? 'Tidak ada booking mendatang' : 'Tidak ada data'"
      :description="tab === 'upcoming' ? 'Buat booking baru untuk memesan ruang rapat.' : ''"
    >
      <button v-if="tab === 'upcoming'" class="btn-primary btn-sm" @click="modal.create()">Buat booking</button>
    </EmptyState>
    <div v-else class="space-y-3 p-4">
      <div v-for="n in 5" :key="n" class="skeleton h-12" :style="{ opacity: 1 - n * 0.15 }" />
    </div>

    <PaginationBar :meta="meta" @change="load" />
  </div>
</template>
