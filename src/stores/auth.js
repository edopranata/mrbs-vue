import { defineStore } from 'pinia'
import api, { TOKEN_KEY } from '@/lib/api'

const USER_KEY = 'mrbs_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
    verified: false,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    /** Admin & System Admin: semua fitur admin. */
    isAdmin: (state) => ['admin', 'system_admin'].includes(state.user?.role),
    /** System Admin: + menu Pengaturan & kelola akun System Admin. */
    isSystemAdmin: (state) => state.user?.role === 'system_admin',
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password, device_name: 'web' })
      this.token = data.token
      localStorage.setItem(TOKEN_KEY, data.token)
      this.setUser(data.user)
      this.verified = true
    },

    /** Sinkronkan data user (mis. role berubah) dari server. */
    async fetchMe() {
      const { data } = await api.get('/auth/me')
      this.setUser(data.data)
      this.verified = true
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        this.clear()
      }
    },

    setUser(user) {
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },

    clear() {
      this.token = null
      this.user = null
      this.verified = false
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
