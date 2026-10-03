<script setup>
import { CalendarPlus, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import api, { errorMessage, validationErrors } from '@/lib/api'
import { stagger } from '@/lib/motion'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const modal = useBookingModal()
const ui = useUiStore()

const rooms = ref([])
const loading = ref(true)

const floors = computed(() => {
  const groups = {}
  for (const room of rooms.value) (groups[room.floor] ??= []).push(room)
  let index = 0 // urutan global untuk animasi bertahap
  return Object.entries(groups).map(([floor, list]) => ({ floor, rooms: list.map((room) => ({ ...room, index: index++ })) }))
})

async function load() {
  try {
    const { data } = await api.get('/rooms')
    rooms.value = data.data
  } catch (e) {
    ui.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ---- Form ruangan (admin) ----
const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#475569']
const formOpen = ref(false)
const dialog = ref(null)
const editingId = ref(null)
const saving = ref(false)
const errors = ref({})
const form = reactive({})

function openForm(room = null) {
  editingId.value = room?.id ?? null
  errors.value = {}
  Object.assign(form, {
    code: room?.code ?? '',
    name: room?.name ?? '',
    floor: room?.floor ?? '',
    capacity: room?.capacity ?? '',
    facilitiesText: (room?.facilities ?? []).join(', '),
    description: room?.description ?? '',
    color: room?.color ?? COLORS[rooms.value.length % COLORS.length],
    is_active: room?.is_active ?? true,
  })
  formOpen.value = true
}

async function save() {
  saving.value = true
  errors.value = {}
  const { facilitiesText, ...rest } = form
  const payload = {
    ...rest,
    facilities: facilitiesText.split(',').map((f) => f.trim()).filter(Boolean),
  }
  try {
    if (editingId.value) await api.put(`/rooms/${editingId.value}`, payload)
    else await api.post('/rooms', payload)
    ui.success(editingId.value ? 'Ruangan berhasil diperbarui.' : 'Ruangan berhasil ditambahkan.')
    dialog.value.close()
    load()
  } catch (e) {
    errors.value = validationErrors(e)
    if (!Object.keys(errors.value).length) ui.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(room) {
  const ok = await ui.confirm({
    title: 'Hapus ruangan',
    message: `Hapus "${room.name}"? Ruangan yang sudah punya riwayat booking tidak bisa dihapus, nonaktifkan saja.`,
    confirmText: 'Hapus',
    danger: true,
  })
  if (!ok) return
  try {
    await api.delete(`/rooms/${room.id}`)
    ui.success('Ruangan berhasil dihapus.')
    load()
  } catch (e) {
    ui.error(errorMessage(e))
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500">{{ rooms.length }} ruang rapat di {{ floors.length }} lantai</p>
      <button v-if="auth.isAdmin" class="btn-primary" @click="openForm()"><Plus class="size-4" /> Tambah Ruangan</button>
    </div>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <div v-for="n in 4" :key="n" class="skeleton h-44" />
    </div>

    <!-- Layar lebar: dua lantai berdampingan agar tidak ada ruang kosong -->
    <div class="grid gap-6 2xl:grid-cols-2">
      <section v-for="group in floors" :key="group.floor">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lantai {{ group.floor }}</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <article
            v-for="room in group.rooms"
            :key="room.id"
            class="card flex animate-rise flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            :class="{ 'opacity-60': !room.is_active }"
            :style="stagger(room.index, 50)"
          >
            <div class="h-1.5" :style="{ background: room.color }" />
            <div class="flex flex-1 flex-col p-5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold text-slate-900">{{ room.name }}</h3>
                  <p class="text-xs text-slate-500">{{ room.code }} · Lantai {{ room.floor }}</p>
                </div>
                <span v-if="!room.is_active" class="badge bg-slate-200 text-slate-600">Nonaktif</span>
                <span v-else class="badge bg-slate-100 text-slate-600"><Users class="size-3" /> {{ room.capacity }} orang</span>
              </div>
              <p v-if="room.description" class="mt-3 text-sm text-slate-600">{{ room.description }}</p>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span v-for="f in room.facilities" :key="f" class="badge bg-indigo-50 text-indigo-700">{{ f }}</span>
              </div>
              <div class="mt-auto flex items-center gap-2 pt-4">
                <button v-if="room.is_active" class="btn-secondary btn-sm" @click="modal.create({ room_id: room.id })">
                  <CalendarPlus class="size-3.5" /> Pesan
                </button>
                <template v-if="auth.isAdmin">
                  <button class="btn-ghost btn-sm ml-auto" @click="openForm(room)"><Pencil class="size-3.5" /> Ubah</button>
                  <button class="btn-ghost btn-sm text-red-600 hover:bg-red-50" aria-label="Hapus" @click="remove(room)">
                    <Trash2 class="size-3.5" />
                  </button>
                </template>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <BaseModal v-if="formOpen" ref="dialog" :title="editingId ? 'Ubah Ruangan' : 'Tambah Ruangan'" @close="formOpen = false">
      <form id="room-form" class="grid grid-cols-2 gap-4" @submit.prevent="save">
        <div>
          <label class="label" for="code">Kode</label>
          <input id="code" v-model="form.code" class="input" :class="{ 'input-error': errors.code }" placeholder="R3A" required />
          <p v-if="errors.code" class="field-error">{{ errors.code }}</p>
        </div>
        <div>
          <label class="label" for="floor">Lantai</label>
          <input id="floor" v-model.number="form.floor" type="number" min="0" class="input" :class="{ 'input-error': errors.floor }" required />
          <p v-if="errors.floor" class="field-error">{{ errors.floor }}</p>
        </div>
        <div class="col-span-2">
          <label class="label" for="name">Nama ruangan</label>
          <input id="name" v-model="form.name" class="input" :class="{ 'input-error': errors.name }" required />
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>
        <div>
          <label class="label" for="capacity">Kapasitas (orang)</label>
          <input id="capacity" v-model.number="form.capacity" type="number" min="1" class="input" :class="{ 'input-error': errors.capacity }" required />
          <p v-if="errors.capacity" class="field-error">{{ errors.capacity }}</p>
        </div>
        <div>
          <span class="label">Warna</span>
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="c in COLORS"
              :key="c"
              type="button"
              class="size-7 rounded-full ring-offset-2 transition"
              :class="{ 'ring-2 ring-slate-800': form.color === c }"
              :style="{ background: c }"
              :aria-label="`Warna ${c}`"
              @click="form.color = c"
            />
          </div>
        </div>
        <div class="col-span-2">
          <label class="label" for="facilities">Fasilitas <span class="font-normal text-slate-400">(pisahkan dengan koma)</span></label>
          <input id="facilities" v-model="form.facilitiesText" class="input" placeholder="Proyektor, AC, Whiteboard" />
        </div>
        <div class="col-span-2">
          <label class="label" for="room-desc">Deskripsi</label>
          <textarea id="room-desc" v-model="form.description" rows="2" class="input" />
        </div>
        <label class="col-span-2 flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.is_active" type="checkbox" class="size-4 rounded border-slate-300 text-indigo-600" />
          Ruangan aktif (dapat dipesan)
        </label>
      </form>
      <template #footer="{ close }">
        <button class="btn-secondary" @click="close">Batal</button>
        <button type="submit" form="room-form" class="btn-primary" :disabled="saving">
          <Loader2 v-if="saving" class="size-4 animate-spin" /> Simpan
        </button>
      </template>
    </BaseModal>
  </div>
</template>
