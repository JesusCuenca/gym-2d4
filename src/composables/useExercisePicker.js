import { ref } from 'vue'

const state = ref({
  open: false,
  resolve: null,
})

export function useExercisePicker() {
  function pickExercises() {
    return new Promise((resolve) => {
      state.value = { open: true, resolve }
    })
  }

  function respond(selectedExercises) {
    const { resolve } = state.value
    state.value = { open: false, resolve: null }
    const formExercises = selectedExercises.map((ex) => ({
      name: ex.displayName,
      repsEveryRound: '',
      notes: '',
    }))
    resolve?.(formExercises)
  }

  function cancel() {
    const { resolve } = state.value
    state.value = { open: false, resolve: null }
    resolve?.([])
  }

  return { state, pickExercises, respond, cancel }
}
