<script setup>
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import api, { errorMessage, validationErrors } from '@/lib/api'
import { stagger } from '@/lib/motion'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()

const ROLE_BADGE = {
  system_admin: 'bg-rose-50 text-rose-700',
  admin: 'bg-purple-50 text-purple-700',
  user: 'bg-slate-100 text-slate-600',
}

/** Admin biasa tidak boleh mengubah/menghapus akun System Admin. */
const canManage = (user) => auth.isSystemAdmin || user.role !== 'system_admin'

const filters = reactive({ search: '', role: '' })
const users = ref([])
const meta = ref(null)
const loading = ref(false)

async function load(page = 1) {
  loading.value = true
  try {
    const params = { page, search: filters.search || undefined, role: filters.role || undefined }
    const { data } = await api.get('/users', { params })
    users.value = data.data
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
onMounted(load)

// ---- Form user ----
const formOpen = ref(false)
const dialog = ref(null)
const editing = ref(null)
const saving = ref(false)
const errors = ref({})
const form = reactive({})

function openForm(user = null) {
  editing.value = user
  errors.value = {}
  Object.assign(form, {
    name: user?.name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'user',
    department: user?.department ?? '',
    phone: user?.phone ?? '',
    is_active: user?.is_active ?? true,
  })
  formOpen.value = true
}

async function save() {
  saving.value = true
  errors.value = {}
  const payload = { ...form }
  if (editing.value && !payload.password) delete payload.password
  try {
    if (editing.value) {
      const { data } = await api.put(`/users/${editing.value.id}`, payload)
      if (data.data.id === auth.user?.id) auth.setUser(data.data)
    } else {
      await api.post('/users', payload)
    }
    ui.success(editing.value ? 'User berhasil diperbarui.' : 'User berhasil ditambahkan.')
    dialog.value.close()
    load(meta.value?.current_page ?? 1)
  } catch (e) {
    errors.value = validationErrors(e)
    if (!Object.keys(errors.value).length) ui.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(user) {
  const ok = await ui.confirm({
    title: 'Hapus user',
    message: `Hapus ${user.name}? Semua booking milik user ini juga akan terhapus. Pertimbangkan untuk menonaktifkan saja.`,
    confirmText: 'Hapus',
    danger: true,
  })
  if (!ok) return
  try {
    await api.delete(`/users/${user.id}`)
    ui.success('User berhasil dihapus.')
    load(meta.value?.current_page ?? 1)
  } catch (e) {
    ui.error(errorMessage(e))
  }
}
</script>

<template>
  <div class="card overflow-hidden">
    <div class="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input v-model="filters.search" class="input pl-9" placeholder="Cari nama, username, email, atau divisi…" />
      </div>
      <select v-model="filters.role" class="input sm:w-40" aria-label="Level">
        <option value="">Semua level</option>
        <option value="system_admin">System Admin</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      <button class="btn-primary" @click="openForm()"><Plus class="size-4" /> Tambah User</button>
    </div>

    <div v-if="users.length" class="overflow-x-auto">
      <table class="table-base">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Divisi</th>
            <th>Level</th>
            <th>Status</th>
            <th class="text-right">Booking</th>
            <th class="w-24"><span class="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <tr v-for="(u, i) in users" :key="u.id" class="animate-rise transition-colors hover:bg-slate-50" :style="stagger(i, 30)">
            <td>
              <p class="font-medium text-slate-900">
                {{ u.name }} <span v-if="u.id === auth.user?.id" class="badge bg-slate-100 text-slate-600">Anda</span>
              </p>
              <p class="text-xs text-slate-500"><span class="font-medium text-slate-600">@{{ u.username }}</span> · {{ u.email }}</p>
            </td>
            <td>{{ u.department || '-' }}</td>
            <td>
              <span class="badge" :class="ROLE_BADGE[u.role]">
                {{ u.role_label }}
              </span>
            </td>
            <td>
              <span class="badge" :class="u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
                {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="text-right tabular-nums">{{ u.bookings_count }}</td>
            <td>
              <div class="flex justify-end gap-1">
                <button v-if="canManage(u)" class="btn-ghost btn-sm" aria-label="Ubah" @click="openForm(u)"><Pencil class="size-3.5" /></button>
                <button
                  v-if="u.id !== auth.user?.id && canManage(u)"
                  class="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  aria-label="Hapus"
                  @click="remove(u)"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else-if="!loading" title="Tidak ada user" />
    <div v-else class="space-y-3 p-4">
      <div v-for="n in 5" :key="n" class="skeleton h-12" :style="{ opacity: 1 - n * 0.15 }" />
    </div>

    <PaginationBar :meta="meta" @change="load" />

    <BaseModal v-if="formOpen" ref="dialog" :title="editing ? 'Ubah User' : 'Tambah User'" @close="formOpen = false">
      <form id="user-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <div class="sm:col-span-2">
          <label class="label" for="u-name">Nama</label>
          <input id="u-name" v-model="form.name" class="input" :class="{ 'input-error': errors.name }" required />
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="u-username">Username <span class="font-normal text-slate-400">(untuk login)</span></label>
          <input
            id="u-username"
            v-model.trim="form.username"
            class="input"
            :class="{ 'input-error': errors.username }"
            placeholder="mis. budi.santoso"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            pattern="[A-Za-z0-9._\-]{2,50}"
            title="2–50 karakter: huruf, angka, titik, garis bawah, atau strip"
            required
          />
          <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
          <p v-else class="mt-1 text-xs text-slate-400">Huruf kecil, angka, titik, garis bawah, atau strip; tanpa spasi.</p>
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="u-email">Email</label>
          <input id="u-email" v-model="form.email" type="email" class="input" :class="{ 'input-error': errors.email }" required />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="u-password">
            Password
            <span v-if="editing" class="font-normal text-slate-400">(kosongkan jika tidak diubah)</span>
          </label>
          <input
            id="u-password"
            v-model="form.password"
            type="password"
            class="input"
            :class="{ 'input-error': errors.password }"
            autocomplete="new-password"
            :required="!editing"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>
        <div>
          <label class="label" for="u-role">Level</label>
          <select id="u-role" v-model="form.role" class="input" :disabled="editing?.id === auth.user?.id">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option v-if="auth.isSystemAdmin || editing?.role === 'system_admin'" value="system_admin">System Admin</option>
          </select>
        </div>
        <div>
          <label class="label" for="u-dept">Divisi</label>
          <input id="u-dept" v-model="form.department" class="input" />
        </div>
        <div>
          <label class="label" for="u-phone">No. telepon</label>
          <input id="u-phone" v-model="form.phone" class="input" />
        </div>
        <label class="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            v-model="form.is_active"
            type="checkbox"
            class="size-4 rounded border-slate-300 text-indigo-600"
            :disabled="editing?.id === auth.user?.id"
          />
          Akun aktif
        </label>
      </form>
      <template #footer="{ close }">
        <button class="btn-secondary" @click="close">Batal</button>
        <button type="submit" form="user-form" class="btn-primary" :disabled="saving">
          <Loader2 v-if="saving" class="size-4 animate-spin" /> Simpan
        </button>
      </template>
    </BaseModal>
  </div>
</template>
