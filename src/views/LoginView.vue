<script setup>
import { AlertCircle, CalendarDays, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const auth = useAuthStore()
const settings = useSettingsStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const attempts = ref(0) // memicu ulang animasi getar di setiap percobaan gagal

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(form.username, form.password)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (e) {
    error.value = errorMessage(e, 'Login gagal.')
    attempts.value++
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen">
    <div class="relative hidden flex-1 flex-col justify-between overflow-hidden bg-indigo-700 p-12 text-white lg:flex">
      <div class="absolute -right-24 -top-24 size-96 animate-float rounded-full bg-indigo-500/40" />
      <div class="absolute -bottom-32 -left-16 size-96 animate-float rounded-full bg-indigo-900/40 [animation-delay:-4.5s]" />
      <div class="relative flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/15"><CalendarDays class="size-6" /></div>
        <span class="text-lg font-semibold">{{ settings.app_name }}</span>
      </div>
      <div class="relative max-w-md">
        <h1 class="text-4xl font-bold leading-tight">Pesan ruang rapat tanpa bentrok jadwal.</h1>
        <p class="mt-4 text-indigo-100">
          Lihat ketersediaan semua ruang rapat secara real-time, lalu booking dalam hitungan detik.
        </p>
      </div>
      <p class="relative text-sm text-indigo-200">{{ settings.app_subtitle }}</p>
    </div>

    <div class="flex flex-1 items-center justify-center p-6">
      <div class="w-full max-w-sm animate-rise">
        <div class="mb-8 lg:hidden">
          <div class="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white"><CalendarDays class="size-6" /></div>
        </div>
        <h2 class="text-2xl font-bold text-slate-900">Masuk</h2>
        <p class="mt-1 text-sm text-slate-500">Gunakan akun kantor Anda untuk melanjutkan.</p>

        <form class="mt-8 space-y-4" @submit.prevent="submit">
          <div v-if="error" :key="attempts" class="flex animate-shake gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle class="mt-0.5 size-4 shrink-0" /> {{ error }}
          </div>
          <div>
            <label class="label" for="username">Username</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="input"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              required
              autofocus
            />
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="input pr-10"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
          </div>
          <button type="submit" class="btn-primary w-full py-2.5" :disabled="loading">
            <Loader2 v-if="loading" class="size-4 animate-spin" /> Masuk
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
