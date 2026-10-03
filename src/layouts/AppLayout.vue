<script setup>
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Settings,
  LogOut,
  Menu,
  UserCircle,
  Users,
  X,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BookingDetailModal from '@/components/BookingDetailModal.vue'
import BookingFormModal from '@/components/BookingFormModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookingModal } from '@/stores/bookingModal'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const settings = useSettingsStore()
const modal = useBookingModal()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

settings.load().catch(() => {})

const menu = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'schedule', label: 'Jadwal Ruangan', icon: CalendarDays },
  { name: 'my-bookings', label: 'Booking Saya', icon: ClipboardList },
  { name: 'rooms', label: 'Ruangan', icon: Building2 },
]
const adminMenu = [
  { name: 'admin-bookings', label: 'Semua Booking', icon: ListChecks },
  { name: 'admin-users', label: 'Manajemen User', icon: Users },
  { name: 'admin-settings', label: 'Pengaturan', icon: Settings, systemAdmin: true },
]
const visibleAdminMenu = computed(() => adminMenu.filter((item) => !item.systemAdmin || auth.isSystemAdmin))

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase(),
)

watch(() => route.fullPath, () => (sidebarOpen.value = false))

async function logout() {
  const ok = await ui.confirm({ title: 'Keluar', message: 'Yakin ingin keluar dari aplikasi?', confirmText: 'Keluar' })
  if (!ok) return
  await auth.logout().catch(() => {})
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Overlay mobile -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div class="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <CalendarDays class="size-5" />
        </div>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-bold text-slate-900">{{ settings.app_name }}</p>
          <p class="truncate text-xs text-slate-500">{{ settings.app_subtitle }}</p>
        </div>
        <button class="btn-ghost shrink-0 p-1.5 lg:hidden" aria-label="Tutup menu" @click="sidebarOpen = false">
          <X class="size-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div class="space-y-1">
          <RouterLink
            v-for="item in menu"
            :key="item.name"
            :to="{ name: item.name }"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            exact-active-class="!bg-indigo-50 !text-indigo-700"
          >
            <component :is="item.icon" class="size-5 transition-transform group-hover:scale-110" />
            {{ item.label }}
          </RouterLink>
        </div>

        <div v-if="auth.isAdmin" class="space-y-1">
          <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</p>
          <RouterLink
            v-for="item in visibleAdminMenu"
            :key="item.name"
            :to="{ name: item.name }"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            exact-active-class="!bg-indigo-50 !text-indigo-700"
          >
            <component :is="item.icon" class="size-5 transition-transform group-hover:scale-110" />
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="border-t border-slate-200 p-3">
        <RouterLink :to="{ name: 'profile' }" class="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-100">
          <div class="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {{ initials }}
          </div>
          <div class="min-w-0 flex-1 leading-tight">
            <p class="truncate text-sm font-medium text-slate-900">{{ auth.user?.name }}</p>
            <p class="truncate text-xs text-slate-500">{{ auth.user?.role_label }} · {{ auth.user?.department || '-' }}</p>
          </div>
          <UserCircle class="size-4 text-slate-400" />
        </RouterLink>
        <button class="btn-ghost mt-1 w-full justify-start px-3 text-red-600 hover:bg-red-50" @click="logout">
          <LogOut class="size-5" /> Keluar
        </button>
      </div>
    </aside>

    <!-- Konten -->
    <div class="lg:pl-64">
      <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button class="btn-ghost -ml-2 p-2 lg:hidden" aria-label="Buka menu" @click="sidebarOpen = true">
          <Menu class="size-5" />
        </button>
        <h1 class="truncate text-lg font-semibold text-slate-900">{{ route.meta.title }}</h1>
        <button class="btn-primary ml-auto" @click="modal.create()">
          <CalendarPlus class="size-4" />
          <span class="hidden sm:inline">Buat Booking</span>
        </button>
      </header>

      <!-- isolate: elemen sticky di dalam konten tidak pernah tergambar di atas header/sidebar -->
      <main class="isolate p-4 sm:p-6">
        <RouterView v-slot="{ Component, route: current }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="current.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <BookingFormModal v-if="modal.formOpen" />
    <BookingDetailModal v-if="modal.detail" />
  </div>
</template>
