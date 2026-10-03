<script setup>
import { Loader2 } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import api, { errorMessage, validationErrors } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()

const profile = reactive({
  name: auth.user?.name ?? '',
  department: auth.user?.department ?? '',
  phone: auth.user?.phone ?? '',
})
const profileErrors = ref({})
const savingProfile = ref(false)

async function saveProfile() {
  savingProfile.value = true
  profileErrors.value = {}
  try {
    const { data } = await api.put('/auth/profile', profile)
    auth.setUser(data.data)
    ui.success('Profil berhasil disimpan.')
  } catch (e) {
    profileErrors.value = validationErrors(e)
    if (!Object.keys(profileErrors.value).length) ui.error(errorMessage(e))
  } finally {
    savingProfile.value = false
  }
}

const password = reactive({ current_password: '', password: '', password_confirmation: '' })
const passwordErrors = ref({})
const savingPassword = ref(false)

async function savePassword() {
  savingPassword.value = true
  passwordErrors.value = {}
  try {
    await api.put('/auth/password', password)
    Object.assign(password, { current_password: '', password: '', password_confirmation: '' })
    ui.success('Password berhasil diubah.')
  } catch (e) {
    passwordErrors.value = validationErrors(e)
    if (!Object.keys(passwordErrors.value).length) ui.error(errorMessage(e))
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <form class="card space-y-4 p-5" @submit.prevent="saveProfile">
      <div>
        <h2 class="font-semibold text-slate-900">Informasi Profil</h2>
        <p class="text-sm text-slate-500">Level akun: {{ auth.user?.role_label }}</p>
      </div>
      <div>
        <label class="label" for="p-username">Username</label>
        <input id="p-username" :value="auth.user?.username" class="input" disabled />
        <p class="mt-1 text-xs text-slate-400">Dipakai untuk login. Hubungi admin untuk mengubahnya.</p>
      </div>
      <div>
        <label class="label" for="p-email">Email</label>
        <input id="p-email" :value="auth.user?.email" class="input" disabled />
      </div>
      <div>
        <label class="label" for="p-name">Nama</label>
        <input id="p-name" v-model="profile.name" class="input" :class="{ 'input-error': profileErrors.name }" required />
        <p v-if="profileErrors.name" class="field-error">{{ profileErrors.name }}</p>
      </div>
      <div>
        <label class="label" for="p-dept">Divisi</label>
        <input id="p-dept" v-model="profile.department" class="input" />
      </div>
      <div>
        <label class="label" for="p-phone">No. telepon</label>
        <input id="p-phone" v-model="profile.phone" class="input" />
      </div>
      <button class="btn-primary" :disabled="savingProfile">
        <Loader2 v-if="savingProfile" class="size-4 animate-spin" /> Simpan Profil
      </button>
    </form>

    <form class="card space-y-4 self-start p-5" @submit.prevent="savePassword">
      <h2 class="font-semibold text-slate-900">Ubah Password</h2>
      <div>
        <label class="label" for="cur-pw">Password saat ini</label>
        <input
          id="cur-pw"
          v-model="password.current_password"
          type="password"
          class="input"
          :class="{ 'input-error': passwordErrors.current_password }"
          autocomplete="current-password"
          required
        />
        <p v-if="passwordErrors.current_password" class="field-error">{{ passwordErrors.current_password }}</p>
      </div>
      <div>
        <label class="label" for="new-pw">Password baru</label>
        <input
          id="new-pw"
          v-model="password.password"
          type="password"
          class="input"
          :class="{ 'input-error': passwordErrors.password }"
          autocomplete="new-password"
          required
        />
        <p v-if="passwordErrors.password" class="field-error">{{ passwordErrors.password }}</p>
      </div>
      <div>
        <label class="label" for="conf-pw">Ulangi password baru</label>
        <input id="conf-pw" v-model="password.password_confirmation" type="password" class="input" autocomplete="new-password" required />
      </div>
      <button class="btn-primary" :disabled="savingPassword">
        <Loader2 v-if="savingPassword" class="size-4 animate-spin" /> Ubah Password
      </button>
    </form>
  </div>
</template>
