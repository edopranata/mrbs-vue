<script setup>
import { Building2, CalendarDays, Clock, Loader2, Pencil, Repeat, Trash2, User, Users, XCircle } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import StatusBadge from './StatusBadge.vue'
import api, { errorMessage } from '@/lib/api'
import { bookingType } from '@/lib/bookingTypes'
import { formatDate, formatDuration } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const modal = useBookingModal()
const auth = useAuthStore()
const ui = useUiStore()

const dialog = ref(null)
const booking = ref(modal.detail)
const cancelMode = ref(false)
const reason = ref('')
const busy = ref(false)
const series = ref(null) // { total, position, following_cancellable } untuk booking berulang
const cancelScope = ref('single')
// Hapus permanen: dari server (can.delete); data lama tanpa field itu → admin.
const canDelete = computed(() => booking.value.can?.delete ?? auth.isAdmin)

// Data dari jadwal tidak selalu memuat relasi ruangan, jadi ambil versi lengkapnya.
onMounted(async () => {
  try {
    const { data } = await api.get(`/bookings/${modal.detail.id}`)
    booking.value = data.data
    series.value = data.series ?? null
  } catch (e) {
    ui.error(errorMessage(e))
  }
})

async function cancelBooking() {
  busy.value = true
  try {
    const { data } = await api.post(`/bookings/${booking.value.id}/cancel`, {
      reason: reason.value || null,
      scope: cancelScope.value,
    })
    ui.success(data.cancelled_count > 1 ? `${data.cancelled_count} booking mingguan berhasil dibatalkan.` : 'Booking berhasil dibatalkan.')
    modal.changed()
    dialog.value.close()
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function deleteBooking() {
  const ok = await ui.confirm({
    title: 'Hapus booking',
    message: `Booking "${booking.value.title}" akan dihapus permanen dari sistem. Lanjutkan?`,
    confirmText: 'Hapus',
    danger: true,
  })
  if (!ok) return
  try {
    await api.delete(`/bookings/${booking.value.id}`)
    ui.success('Booking berhasil dihapus.')
    modal.changed()
    dialog.value.close()
  } catch (e) {
    ui.error(errorMessage(e))
  }
}
</script>

<template>
  <BaseModal ref="dialog" size="md" @close="modal.closeDetail()">
    <template #title>
      <span class="flex items-center gap-2">
        Detail Booking
        <StatusBadge :booking="booking" />
      </span>
    </template>

    <h3 class="text-lg font-semibold text-slate-900">{{ booking.title }}</h3>
    <div class="mt-1 flex flex-wrap gap-1.5">
      <span v-if="booking.type" class="badge text-slate-800" :class="bookingType(booking.type).swatch">
        Rapat {{ bookingType(booking.type).label }}
      </span>
      <span v-if="booking.is_recurring" class="badge bg-indigo-50 text-indigo-700">
        <Repeat class="size-3" />
        Mingguan<template v-if="series"> · minggu ke-{{ series.position }} dari {{ series.total }}</template>
      </span>
      <span v-if="booking.is_legacy" class="badge bg-amber-50 text-amber-700">Dari MRBS lama</span>
    </div>

    <dl class="mt-4 space-y-3 text-sm">
      <div class="flex gap-3">
        <dt class="text-slate-400"><Building2 class="size-5" /></dt>
        <dd v-if="booking.room" class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" :style="{ background: booking.room.color }" />
          {{ booking.room.name }} · Lantai {{ booking.room.floor }}
        </dd>
        <dd v-else class="text-slate-400">Memuat…</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-slate-400"><CalendarDays class="size-5" /></dt>
        <dd>{{ formatDate(booking.date) }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-slate-400"><Clock class="size-5" /></dt>
        <dd>{{ booking.start_time }} – {{ booking.end_time }} ({{ formatDuration(booking.duration_minutes) }})</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-slate-400"><User class="size-5" /></dt>
        <dd>
          {{ booking.user?.name }}
          <span v-if="booking.user?.department" class="text-slate-500">· {{ booking.user.department }}</span>
          <span v-if="booking.user_id === auth.user?.id" class="badge ml-1 bg-slate-100 text-slate-600">Anda</span>
        </dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-slate-400"><Users class="size-5" /></dt>
        <dd>{{ booking.participants }} peserta</dd>
      </div>
    </dl>

    <div v-if="booking.description" class="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      {{ booking.description }}
    </div>

    <div v-if="booking.legacy_locked" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Booking ini berasal dari MRBS lama. Selama masa transisi, ubah atau batalkan di MRBS lama;
      perubahannya akan tersinkron otomatis.
    </div>
    <div v-if="booking.status === 'cancelled'" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      Dibatalkan<span v-if="booking.cancelled_by"> oleh {{ booking.cancelled_by }}</span>.
      <span v-if="booking.cancel_reason">Alasan: {{ booking.cancel_reason }}</span>
    </div>

    <Transition name="fade">
      <div v-if="cancelMode" class="mt-4 space-y-2 rounded-lg border border-slate-200 p-3">
        <fieldset v-if="series && series.following_cancellable > 1" class="mb-2 space-y-1.5">
          <legend class="label">Batalkan</legend>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input v-model="cancelScope" type="radio" value="single" class="size-4 text-indigo-600" />
            Hanya booking ini ({{ formatDate(booking.date, { day: 'numeric', month: 'long' }) }})
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input v-model="cancelScope" type="radio" value="following" class="size-4 text-indigo-600" />
            Booking ini &amp; minggu-minggu berikutnya ({{ series.following_cancellable }} booking)
          </label>
        </fieldset>
        <label class="label" for="reason">Alasan pembatalan <span class="font-normal text-slate-400">(opsional)</span></label>
        <input id="reason" v-model="reason" class="input" placeholder="mis. Rapat ditunda" />
        <div class="flex justify-end gap-2">
          <button class="btn-secondary btn-sm" @click="cancelMode = false">Kembali</button>
          <button class="btn-danger btn-sm" :disabled="busy" @click="cancelBooking">
            <Loader2 v-if="busy" class="size-3.5 animate-spin" />
            {{ cancelScope === 'following' ? `Ya, batalkan ${series.following_cancellable} booking` : 'Ya, batalkan booking' }}
          </button>
        </div>
      </div>
    </Transition>

    <template v-if="!cancelMode && (booking.can?.update || booking.can?.cancel || canDelete)" #footer>
      <button v-if="canDelete" class="btn-ghost mr-auto text-red-600 hover:bg-red-50" @click="deleteBooking">
        <Trash2 class="size-4" /> Hapus
      </button>
      <button v-if="booking.can?.cancel" class="btn-secondary text-red-600" @click="cancelMode = true">
        <XCircle class="size-4" /> Batalkan
      </button>
      <button v-if="booking.can?.update" class="btn-primary" @click="modal.edit(booking)">
        <Pencil class="size-4" /> Ubah
      </button>
    </template>
  </BaseModal>
</template>
