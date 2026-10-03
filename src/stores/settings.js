import { defineStore } from 'pinia'
import api from '@/lib/api'

// Nilai di sini hanya cadangan sebelum /settings selesai dimuat.
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    app_name: 'MRBS',
    app_subtitle: 'Booking Ruang Rapat',
    open_time: '07:00',
    close_time: '20:00',
    slot_minutes: 30,
    min_duration: 30,
    max_duration: 480,
    max_advance_days: 60,
    max_repeat_weeks: 8,
    loaded: false,
  }),

  actions: {
    async load({ force = false } = {}) {
      if (this.loaded && !force) return
      const { data } = await api.get('/settings')
      this.$patch({ ...data, loaded: true })
    },

    /** Dipakai setelah System Admin menyimpan pengaturan. */
    apply(values) {
      this.$patch(values)
    },
  },
})
