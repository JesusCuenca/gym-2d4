<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, TIMED_PRESETS, isTimed } from '../models/blockTypes'
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from '@heroicons/vue/20/solid'

const router = useRouter()
const route = useRoute()
const blockStore = useBlockStore()

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')

const form = ref({
  name: '',
  type: 'timed',
  preset: null,
  // Timed fields
  workMinutes: '15',
  workSeconds: '00',
  restMinutes: '0',
  restSeconds: '00',
  rounds: '',
  exerciseMode: 'all',
  // Reps fields
  repsEveryRound: '',
  repsPerRound: '',
  // Exercises
  exercises: [createEmptyExercise()],
})

function createEmptyExercise() {
  return { name: '', repsEveryRound: '', notes: '' }
}

// Computed visibility
const isTimedType = computed(() => isTimed(form.value.type))
const showWorkTime = computed(() => isTimedType.value)
const showRestTime = computed(() => isTimedType.value && form.value.preset !== 'amrap')
const showRounds = computed(() => {
  if (isTimedType.value) return form.value.preset !== 'amrap'
  return true
})
const showExerciseMode = computed(() => isTimedType.value && !form.value.preset)
const showBlockReps = computed(() => !isTimedType.value)
const showExerciseReps = computed(() => {
  if (isTimedType.value) return form.value.exerciseMode === 'all'
  return true
})

// Label for work time changes by preset
const workTimeLabel = computed(() => {
  if (form.value.preset === 'amrap') return 'Tiempo total'
  return 'Tiempo de trabajo'
})

function selectPreset(presetValue) {
  if (form.value.preset === presetValue) {
    // Deselect → custom
    form.value.preset = null
    return
  }
  form.value.preset = presetValue
  const preset = TIMED_PRESETS.find((p) => p.value === presetValue)
  if (!preset) return

  // Apply preset defaults
  if (preset.defaults.rounds != null) form.value.rounds = String(preset.defaults.rounds)
  if (preset.defaults.restSeconds != null) {
    form.value.restMinutes = String(Math.floor(preset.defaults.restSeconds / 60))
    form.value.restSeconds = String(preset.defaults.restSeconds % 60).padStart(2, '0')
  }
  if (preset.defaults.workSeconds != null) {
    form.value.workMinutes = String(Math.floor(preset.defaults.workSeconds / 60))
    form.value.workSeconds = String(preset.defaults.workSeconds % 60).padStart(2, '0')
  }
  if (preset.defaults.exerciseMode) form.value.exerciseMode = preset.defaults.exerciseMode
}

// Reset preset when type changes
watch(() => form.value.type, () => {
  form.value.preset = null
})

function addExercise() {
  form.value.exercises.push(createEmptyExercise())
}

function removeExercise(index) {
  if (form.value.exercises.length > 1) {
    form.value.exercises.splice(index, 1)
  }
}

function moveExercise(index, direction) {
  const target = index + direction
  if (target < 0 || target >= form.value.exercises.length) return
  const exercises = form.value.exercises
  ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
}

async function handleSubmit() {
  validationError.value = ''
  const hasExercises = form.value.exercises.some((ex) => ex.name.trim())
  if (!hasExercises) {
    validationError.value = 'Añade al menos un ejercicio con nombre.'
    return
  }

  submitting.value = true
  try {
    const blockData = { name: form.value.name, type: form.value.type }

    if (isTimedType.value) {
      blockData.preset = form.value.preset || null
      blockData.workSeconds = parseInt(form.value.workMinutes || 0) * 60 + parseInt(form.value.workSeconds || 0)
      blockData.restSeconds = form.value.preset === 'amrap' ? 0 : parseInt(form.value.restMinutes || 0) * 60 + parseInt(form.value.restSeconds || 0)
      blockData.rounds = form.value.preset === 'amrap' ? 1 : parseInt(form.value.rounds) || 1
      blockData.exerciseMode = form.value.exerciseMode
    } else {
      // Reps
      blockData.rounds = parseInt(form.value.rounds) || 1
      const repsPerRoundStr = form.value.repsPerRound.trim()
      if (repsPerRoundStr) {
        blockData.repsPerRound = repsPerRoundStr.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
        blockData.rounds = blockData.repsPerRound.length
      } else {
        blockData.repsPerRound = null
      }
      blockData.repsEveryRound = form.value.repsEveryRound ? parseInt(form.value.repsEveryRound) : null
    }

    blockData.exercises = form.value.exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name,
        repsEveryRound: showExerciseReps.value && ex.repsEveryRound ? parseInt(ex.repsEveryRound) : null,
        notes: ex.notes || null,
      }))

    if (isEditMode.value) {
      await blockStore.updateBlock(route.params.id, blockData)
    } else {
      await blockStore.createBlock(blockData)
    }

    router.push({ name: 'admin-blocks' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (isEditMode.value) {
    loading.value = true
    const block = await blockStore.getBlock(route.params.id)
    loading.value = false
    if (block) {
      form.value.name = block.name
      form.value.type = block.type
      form.value.preset = block.preset || null
      if (block.workSeconds != null) {
        form.value.workMinutes = String(Math.floor(block.workSeconds / 60))
        form.value.workSeconds = String(block.workSeconds % 60).padStart(2, '0')
      }
      if (block.restSeconds != null) {
        form.value.restMinutes = String(Math.floor(block.restSeconds / 60))
        form.value.restSeconds = String(block.restSeconds % 60).padStart(2, '0')
      }
      form.value.rounds = block.rounds ? String(block.rounds) : ''
      form.value.exerciseMode = block.exerciseMode || 'all'
      form.value.repsEveryRound = block.repsEveryRound ? String(block.repsEveryRound) : ''
      form.value.repsPerRound = block.repsPerRound ? block.repsPerRound.join(', ') : ''
      form.value.exercises = block.exercises?.length
        ? block.exercises.map((ex) => ({
            name: ex.name || '',
            repsEveryRound: ex.repsEveryRound ? String(ex.repsEveryRound) : '',
            notes: ex.notes || '',
          }))
        : [createEmptyExercise()]
    }
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar bloque' : 'Crear bloque' }}
    </h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Block Name -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Nombre del bloque</label>
        <input
          v-model="form.name"
          type="text"
          required
          placeholder="Ej. AMRAP 15 min"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
      </div>

      <!-- Block Type -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Tipo</label>
        <div class="flex gap-2">
          <button
            v-for="bt in BLOCK_TYPES"
            :key="bt.value"
            type="button"
            @click="form.type = bt.value"
            class="flex-1 rounded-lg px-4 py-3 font-bold text-sm transition-colors border"
            :class="form.type === bt.value
              ? 'bg-gymOrange text-white border-gymOrange'
              : 'bg-white/5 text-white/70 border-white/20 hover:border-white/40'"
          >
            {{ bt.label }}
          </button>
        </div>
      </div>

      <!-- Timed Presets -->
      <div v-if="isTimedType">
        <label class="block text-sm text-white/70 mb-1">Configuración rápida</label>
        <div class="flex gap-2">
          <button
            v-for="p in TIMED_PRESETS"
            :key="p.value"
            type="button"
            @click="selectPreset(p.value)"
            class="rounded-lg px-4 py-2 text-sm font-bold transition-colors border"
            :class="form.preset === p.value
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Work Time (timed) -->
      <div v-if="showWorkTime">
        <label class="block text-sm text-white/70 mb-1">{{ workTimeLabel }}</label>
        <div class="flex items-center gap-2">
          <input
            v-model="form.workMinutes"
            type="number"
            min="0"
            placeholder="15"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">min</span>
          <input
            v-model="form.workSeconds"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">seg</span>
        </div>
      </div>

      <!-- Rest Time (timed, not AMRAP) -->
      <div v-if="showRestTime">
        <label class="block text-sm text-white/70 mb-1">Tiempo de descanso</label>
        <div class="flex items-center gap-2">
          <input
            v-model="form.restMinutes"
            type="number"
            min="0"
            placeholder="0"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">min</span>
          <input
            v-model="form.restSeconds"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">seg</span>
        </div>
      </div>

      <!-- Rounds -->
      <div v-if="showRounds">
        <label class="block text-sm text-white/70 mb-1">Rondas</label>
        <input
          v-model="form.rounds"
          type="number"
          min="1"
          placeholder="Ej. 5"
          class="w-32 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
      </div>

      <!-- Exercise Mode (timed, custom only) -->
      <div v-if="showExerciseMode">
        <label class="block text-sm text-white/70 mb-1">Modo de ejercicios</label>
        <div class="flex gap-2">
          <button
            type="button"
            @click="form.exerciseMode = 'all'"
            class="flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors border"
            :class="form.exerciseMode === 'all'
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
          >
            Todos a la vez
          </button>
          <button
            type="button"
            @click="form.exerciseMode = 'rotate'"
            class="flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors border"
            :class="form.exerciseMode === 'rotate'
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
          >
            Uno por uno
          </button>
        </div>
      </div>

      <!-- Block-level reps (reps type) -->
      <div v-if="showBlockReps" class="space-y-4">
        <div>
          <label class="block text-sm text-white/70 mb-1">Reps por ronda (todas iguales)</label>
          <input
            v-model="form.repsEveryRound"
            type="number"
            min="1"
            placeholder="Ej. 10 (dejar vacío si cada ejercicio tiene reps distintas)"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
          />
        </div>
        <div>
          <label class="block text-sm text-white/70 mb-1">Reps por ronda (variable)</label>
          <input
            v-model="form.repsPerRound"
            type="text"
            placeholder="Ej. 21, 15, 9 (sobrescribe rondas)"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
          />
        </div>
      </div>

      <!-- Exercises -->
      <div>
        <label class="block text-sm text-white/70 mb-3">Ejercicios</label>
        <div class="space-y-3">
          <div
            v-for="(exercise, index) in form.exercises"
            :key="index"
            class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-white/50 text-sm font-medium">#{{ index + 1 }}</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="moveExercise(index, -1)"
                  :disabled="index === 0"
                  class="text-white/30 hover:text-white disabled:opacity-20 p-1"
                ><ChevronUpIcon class="w-4 h-4" /></button>
                <button
                  type="button"
                  @click="moveExercise(index, 1)"
                  :disabled="index === form.exercises.length - 1"
                  class="text-white/30 hover:text-white disabled:opacity-20 p-1"
                ><ChevronDownIcon class="w-4 h-4" /></button>
                <button
                  type="button"
                  @click="removeExercise(index)"
                  :disabled="form.exercises.length === 1"
                  class="text-red-400/70 hover:text-red-400 disabled:opacity-20 p-1"
                ><TrashIcon class="w-4 h-4" /></button>
              </div>
            </div>

            <input
              v-model="exercise.name"
              type="text"
              required
              placeholder="Nombre del ejercicio"
              class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
            />

            <div class="flex gap-2">
              <div v-if="showExerciseReps" class="w-32">
                <label class="block text-xs text-white/50 mb-1">Reps</label>
                <input
                  v-model="exercise.repsEveryRound"
                  type="number"
                  min="1"
                  placeholder="—"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-gymOrange"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs text-white/50 mb-1">Notas</label>
                <input
                  v-model="exercise.notes"
                  type="text"
                  placeholder="Opcional"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="addExercise"
          class="mt-3 w-full border border-dashed border-white/20 rounded-lg py-3 text-white/50 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          + Añadir ejercicio
        </button>
      </div>

      <!-- Validation error -->
      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <!-- Submit -->
      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          :disabled="submitting"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Guardando...' : isEditMode ? 'Actualizar bloque' : 'Crear bloque' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-blocks' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
