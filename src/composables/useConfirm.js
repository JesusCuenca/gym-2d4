import { ref } from 'vue'

const state = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Eliminar',
  confirmClass: 'bg-red-600 hover:bg-red-500 text-white',
  resolve: null,
})

export function useConfirm() {
  function confirm({ title, message, confirmLabel = 'Eliminar', danger = true }) {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        title,
        message,
        confirmLabel,
        confirmClass: danger
          ? 'bg-red-600 hover:bg-red-500 text-white'
          : 'bg-gymOrange hover:bg-gymOrange/90 text-white',
        resolve,
      }
    })
  }

  function respond(result) {
    const { resolve } = state.value
    state.value = { ...state.value, open: false, resolve: null }
    resolve?.(result)
  }

  return { state, confirm, respond }
}
