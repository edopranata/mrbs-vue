import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true, title: 'Login' },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
      { path: 'jadwal', name: 'schedule', component: () => import('@/views/ScheduleView.vue'), meta: { title: 'Jadwal Ruangan' } },
      { path: 'booking-saya', name: 'my-bookings', component: () => import('@/views/MyBookingsView.vue'), meta: { title: 'Booking Saya' } },
      { path: 'ruangan', name: 'rooms', component: () => import('@/views/RoomsView.vue'), meta: { title: 'Ruangan' } },
      { path: 'profil', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: 'Profil' } },
      {
        path: 'admin/booking',
        name: 'admin-bookings',
        component: () => import('@/views/admin/BookingsView.vue'),
        meta: { admin: true, title: 'Semua Booking' },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { admin: true, title: 'Manajemen User' },
      },
      {
        path: 'admin/pengaturan',
        name: 'admin-settings',
        component: () => import('@/views/admin/SettingsView.vue'),
        meta: { systemAdmin: true, title: 'Pengaturan' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth || to.matched.some((r) => r.meta.requiresAuth)) {
    if (!auth.isLoggedIn) {
      return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
    }
    if (!auth.verified) {
      try {
        await auth.fetchMe()
      } catch {
        auth.clear()
        return { name: 'login' }
      }
    }
  }

  if (to.meta.guest && auth.isLoggedIn) return { name: 'dashboard' }
  if (to.meta.admin && !auth.isAdmin) return { name: 'dashboard' }
  if (to.meta.systemAdmin && !auth.isSystemAdmin) return { name: 'dashboard' }
})

export default router
