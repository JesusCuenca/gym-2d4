import { ref } from 'vue'

const state = ref({
  open: false,
  resolve: null,
})

export function useBlockPicker() {
  function pickBlocks() {
    return new Promise((resolve) => {
      state.value = { open: true, resolve }
    })
  }

  function respond(selectedBlocks) {
    const { resolve } = state.value
    state.value = { open: false, resolve: null }
    resolve?.(selectedBlocks)
  }

  function cancel() {
    const { resolve } = state.value
    state.value = { open: false, resolve: null }
    resolve?.([])
  }

  return { state, pickBlocks, respond, cancel }
}
