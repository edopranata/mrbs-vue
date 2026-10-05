import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

/**
 * Mengontrol modal form & detail booking yang dirender global di AppLayout,
 * sehingga halaman mana pun bisa membukanya. `version` bertambah setiap ada
 * perubahan data booking agar halaman yang sedang tampil bisa memuat ulang.
 */
export const useBookingModal = defineStore('bookingModal', {
  state: () => ({
    formOpen: false,
    editing: null,
    defaults: {},
    detail: null,
    version: 0,
  }),

  actions: {
    create(defaults = {}) {
      if (useAuthStore().isViewer) return
      this.editing = null
      this.defaults = defaults
      this.detail = null
      this.formOpen = true
    },
    edit(booking) {
      this.editing = booking
      this.defaults = {}
      this.detail = null
      this.formOpen = true
    },
    show(booking) {
      this.detail = booking
    },
    closeForm() {
      this.formOpen = false
      this.editing = null
    },
    closeDetail() {
      this.detail = null
    },
    changed() {
      this.version++
    },
  },
})
