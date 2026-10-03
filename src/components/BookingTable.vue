<script setup>
import { ChevronRight, Repeat } from 'lucide-vue-next'
import StatusBadge from './StatusBadge.vue'
import { formatDateShort } from '@/lib/format'
import { stagger } from '@/lib/motion'
import { useBookingModal } from '@/stores/bookingModal'

defineProps({
  bookings: { type: Array, required: true },
  showUser: { type: Boolean, default: false },
})

const modal = useBookingModal()
</script>

<template>
  <!-- Tabel (desktop) -->
  <div class="hidden overflow-x-auto md:block">
    <table class="table-base">
      <thead>
        <tr>
          <th>Rapat</th>
          <th v-if="showUser">Pemesan</th>
          <th>Ruangan</th>
          <th>Waktu</th>
          <th>Peserta</th>
          <th>Status</th>
          <th class="w-10"><span class="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white">
        <tr
          v-for="(b, i) in bookings"
          :key="b.id"
          class="animate-rise cursor-pointer transition-colors hover:bg-slate-50"
          :style="stagger(i, 30)"
          @click="modal.show(b)"
        >
          <td class="max-w-xs">
            <p class="flex items-center gap-1.5 truncate font-medium text-slate-900">
              <Repeat v-if="b.is_recurring" class="size-3.5 shrink-0 text-indigo-500" aria-label="Berulang mingguan" />
              {{ b.title }}
            </p>
            <p v-if="b.status === 'cancelled' && b.cancel_reason" class="truncate text-xs text-red-600">{{ b.cancel_reason }}</p>
          </td>
          <td v-if="showUser">
            <p>{{ b.user?.name }}</p>
            <p class="text-xs text-slate-500">{{ b.user?.department }}</p>
          </td>
          <td>
            <p class="flex items-center gap-2">
              <span class="size-2.5 shrink-0 rounded-full" :style="{ background: b.room?.color }" />
              {{ b.room?.name }}
            </p>
            <p class="text-xs text-slate-500">Lantai {{ b.room?.floor }}</p>
          </td>
          <td class="whitespace-nowrap">
            <p>{{ formatDateShort(b.date) }}</p>
            <p class="text-xs text-slate-500">{{ b.start_time }}–{{ b.end_time }}</p>
          </td>
          <td>{{ b.participants }}</td>
          <td><StatusBadge :booking="b" /></td>
          <td><ChevronRight class="size-4 text-slate-400" /></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Kartu (mobile) -->
  <ul class="divide-y divide-slate-100 md:hidden">
    <li v-for="(b, i) in bookings" :key="b.id" class="animate-rise" :style="stagger(i, 30)">
      <button class="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50" @click="modal.show(b)">
        <span class="mt-1 w-1 shrink-0 self-stretch rounded-full" :style="{ background: b.room?.color }" />
        <span class="min-w-0 flex-1">
          <span class="flex items-start justify-between gap-2">
            <span class="truncate text-sm font-medium text-slate-900">{{ b.title }}</span>
            <StatusBadge :booking="b" />
          </span>
          <span class="block text-xs text-slate-500">{{ formatDateShort(b.date) }}, {{ b.start_time }}–{{ b.end_time }}</span>
          <span class="block text-xs text-slate-500">
            {{ b.room?.name }} · Lt. {{ b.room?.floor }}<template v-if="showUser"> · {{ b.user?.name }}</template>
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>
