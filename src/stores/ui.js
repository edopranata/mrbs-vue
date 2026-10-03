import { defineStore } from 'pinia'

let toastId = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [],
    confirmDialog: null,
  }),

  actions: {
    toast(message, type = 'success', timeout = 3500) {
      const id = ++toastId
      this.toasts.push({ id, message, type, timeout })
      setTimeout(() => this.dismiss(id), timeout)
    },

    success(message) {
      this.toast(message, 'success')
    },

    error(message) {
      this.toast(message, 'error', 5000)
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },

    /**
     * Dialog konfirmasi berbasis Promise.
     * @returns {Promise<boolean>}
     */
    confirm({ title, message, confirmText = 'Ya, lanjutkan', danger = false }) {
      return new Promise((resolve) => {
        this.confirmDialog = { title, message, confirmText, danger, resolve }
      })
    },

    resolveConfirm(value) {
      this.confirmDialog?.resolve(value)
      this.confirmDialog = null
    },
  },
})
