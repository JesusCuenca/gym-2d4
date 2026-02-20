<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, TIMED_SUBTYPES, REPS_SUBTYPES, isTimed, getRepsSubcase } from '../models/blockTypes'
import { validateBlock } from '../utils/validation'
import { Bars2Icon, TrashIcon } from '@heroicons/vue/20/solid'
import { useExercisePicker } from '../composables/useExercisePicker'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'
import draggable from 'vuedraggable'

const { pickExercises } = useExercisePicker()

let exerciseIdCounter = 0

async function openExercisePicker() {
  const picked = await pickExercises()
  if (!picked.length) return
  const withIds = picked.map((ex) => ({ ...ex, _id: ++exerciseIdCounter }))
  const hasOnlyEmpty = form.value.exercises.length === 1 && !form.value.exercises[0].name
  if (hasOnlyEmpty) {
    form.value.exercises = withIds
  } else {
    form.value.exercises.push(...withIds)
  }
}

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
  subtype: 'custom',
  // Timed fields
  workMinutes: '15',
  workSeconds: '00',
  restMinutes: '0',
  restSeconds: '00',
  rounds: '',
  exerciseMode: 'all',
  // Reps fields
  repsEveryRound: '',
  repsPerRound: [''],
  // Exercises
  exercises: [createEmptyExercise()],
})

const { isDirty, markClean, takeSnapshot } = useUnsavedChanges(() => form.value)

function createEmptyExercise() {
  return { _id: ++exerciseIdCounter, name: '', repsEveryRound: '', notes: '' }
}

// Computed visibility
const isTimedType = computed(() => isTimed(form.value.type))
const showWorkTime = computed(() => isTimedType.value)
const showRestTime = computed(() => isTimedType.value && form.value.subtype !== 'amrap')
const showRounds = computed(() => {
  if (isTimedType.value) return form.value.subtype !== 'amrap'
  if (!isTimedType.value) return form.value.subtype !== 'perRound'
  return true
})
const showExerciseMode = computed(() => isTimedType.value && form.value.subtype === 'custom')
const showBlockReps = computed(() => !isTimedType.value)
const showExerciseReps = computed(() => {
  if (isTimedType.value) return form.value.exerciseMode === 'all'
  return form.value.subtype === 'perExercise'
})
const exerciseRepsRequired = computed(() => {
  if (isTimedType.value) return ['amrap', 'emom'].includes(form.value.subtype)
  return form.value.subtype === 'perExercise'
})

// Label for work time changes by subtype
const workTimeLabel = computed(() => {
  if (form.value.subtype === 'amrap') return 'Tiempo total'
  return 'Tiempo de trabajo'
})

// Time stepper helpers
const WORK_MIN = 10
const WORK_MAX = 3600
const REST_MIN = 0
const REST_MAX = 600

function getWorkTotalSeconds() {
  return parseInt(form.value.workMinutes || 0) * 60 + parseInt(form.value.workSeconds || 0)
}

function setWorkFromTotal(total) {
  total = Math.max(WORK_MIN, Math.min(WORK_MAX, total))
  form.value.workMinutes = String(Math.floor(total / 60))
  form.value.workSeconds = String(total % 60).padStart(2, '0')
}

function getRestTotalSeconds() {
  return parseInt(form.value.restMinutes || 0) * 60 + parseInt(form.value.restSeconds || 0)
}

function setRestFromTotal(total) {
  total = Math.max(REST_MIN, Math.min(REST_MAX, total))
  form.value.restMinutes = String(Math.floor(total / 60))
  form.value.restSeconds = String(total % 60).padStart(2, '0')
}

function stepWork(delta) {
  setWorkFromTotal(getWorkTotalSeconds() + delta)
}

function stepRest(delta) {
  setRestFromTotal(getRestTotalSeconds() + delta)
}

function canStepWork(delta) {
  const next = getWorkTotalSeconds() + delta
  return next >= WORK_MIN && next <= WORK_MAX
}

function canStepRest(delta) {
  const next = getRestTotalSeconds() + delta
  return next >= REST_MIN && next <= REST_MAX
}

function selectSubtype(subtypeValue) {
  form.value.subtype = subtypeValue
  const entry = TIMED_SUBTYPES.find((p) => p.value === subtypeValue)
  if (!entry?.defaults) return

  // Apply subtype defaults
  if (entry.defaults.rounds != null) form.value.rounds = String(entry.defaults.rounds)
  if (entry.defaults.restSeconds != null) {
    form.value.restMinutes = String(Math.floor(entry.defaults.restSeconds / 60))
    form.value.restSeconds = String(entry.defaults.restSeconds % 60).padStart(2, '0')
  }
  if (entry.defaults.workSeconds != null) {
    form.value.workMinutes = String(Math.floor(entry.defaults.workSeconds / 60))
    form.value.workSeconds = String(entry.defaults.workSeconds % 60).padStart(2, '0')
  }
  if (entry.defaults.exerciseMode) form.value.exerciseMode = entry.defaults.exerciseMode
}

// Reset subtype when type changes
watch(() => form.value.type, (newType) => {
  form.value.subtype = isTimed(newType) ? 'custom' : 'sameReps'
})

// Reps per round dynamic inputs
function addRepsRound() {
  form.value.repsPerRound.push('')
}

function removeRepsRound(index) {
  if (form.value.repsPerRound.length > 1) {
    form.value.repsPerRound.splice(index, 1)
  }
}

function addExercise() {
  form.value.exercises.push(createEmptyExercise())
}

function removeExercise(index) {
  if (form.value.exercises.length > 1) {
    form.value.exercises.splice(index, 1)
  }
}

function buildBlockData() {
  const blockData = { name: form.value.name, type: form.value.type }

  if (isTimedType.value) {
    blockData.subtype = form.value.subtype === 'custom' ? null : form.value.subtype
    blockData.workSeconds = parseInt(form.value.workMinutes || 0) * 60 + parseInt(form.value.workSeconds || 0)
    blockData.restSeconds = form.value.subtype === 'amrap' ? 0 : parseInt(form.value.restMinutes || 0) * 60 + parseInt(form.value.restSeconds || 0)
    blockData.rounds = form.value.subtype === 'amrap' ? 1 : parseInt(form.value.rounds) || 1
    blockData.exerciseMode = form.value.exerciseMode
  } else {
    blockData.subtype = form.value.subtype
    // Reps — clear fields not relevant to the selected subtype
    if (form.value.subtype === 'perRound') {
      const parsed = form.value.repsPerRound.map((s) => parseInt(s)).filter((n) => !isNaN(n) && n > 0)
      blockData.repsPerRound = parsed.length ? parsed : null
      blockData.rounds = parsed.length || parseInt(form.value.rounds) || 1
      blockData.repsEveryRound = null
    } else if (form.value.subtype === 'sameReps') {
      blockData.repsEveryRound = form.value.repsEveryRound ? parseInt(form.value.repsEveryRound) : null
      blockData.repsPerRound = null
      blockData.rounds = parseInt(form.value.rounds) || 1
    } else {
      // perExercise
      blockData.repsEveryRound = null
      blockData.repsPerRound = null
      blockData.rounds = parseInt(form.value.rounds) || 1
    }
  }

  blockData.exercises = form.value.exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => ({
      name: ex.name,
      repsEveryRound: showExerciseReps.value && ex.repsEveryRound ? parseInt(ex.repsEveryRound) : null,
      notes: ex.notes || null,
    }))

  return blockData
}

async function handleSubmit() {
  validationError.value = ''
  const blockData = buildBlockData()
  const result = validateBlock(blockData)
  if (!result.valid) {
    validationError.value = result.message
    return
  }

  submitting.value = true
  try {
    if (isEditMode.value) {
      await blockStore.updateBlock(route.params.id, blockData)
    } else {
      await blockStore.createBlock(blockData)
    }
    markClean()
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
      // Backward compat: read subtype or legacy preset
      form.value.subtype = block.type === 'reps' ? getRepsSubcase(block) : (block.subtype || block.preset || 'custom')
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
      form.value.repsPerRound = block.repsPerRound?.length
        ? block.repsPerRound.map(String)
        : ['']
      form.value.exercises = block.exercises?.length
        ? block.exercises.map((ex) => ({
            _id: ++exerciseIdCounter,
            name: ex.name || '',
            repsEveryRound: ex.repsEveryRound ? String(ex.repsEveryRound) : '',
            notes: ex.notes || '',
          }))
        : [createEmptyExercise()]
    }
  }
  await nextTick()
  takeSnapshot()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar bloque' : 'Crear bloque' }}
      <span v-if="isDirty" class="inline-block w-2 h-2 bg-gymOrange rounded-full ml-2 align-middle" title="Cambios sin guardar" />
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

      <!-- Timed Subtypes -->
      <div v-if="isTimedType">
        <label class="block text-sm text-white/70 mb-1">Subtipo</label>
        <div class="flex gap-2">
          <button
            v-for="st in TIMED_SUBTYPES"
            :key="st.value"
            type="button"
            @click="selectSubtype(st.value)"
            class="rounded-lg px-4 py-2 text-sm font-bold transition-colors border"
            :class="form.subtype === st.value
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
          >
            {{ st.label }}
          </button>
        </div>
      </div>

      <!-- Reps Subtypes -->
      <div v-if="showBlockReps">
        <label class="block text-sm text-white/70 mb-1">Subtipo</label>
        <div class="flex gap-2">
          <button
            v-for="st in REPS_SUBTYPES"
            :key="st.value"
            type="button"
            @click="form.subtype = st.value"
            class="rounded-lg px-4 py-2 text-sm font-bold transition-colors border"
            :class="form.subtype === st.value
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
          >
            {{ st.label }}
          </button>
        </div>
      </div>

      <!-- Work Time (timed) with steppers -->
      <div v-if="showWorkTime">
        <label class="block text-sm text-white/70 mb-1">{{ workTimeLabel }}</label>
        <div class="flex items-center gap-1">
          <button type="button" @click="stepWork(-30)" :disabled="!canStepWork(-30)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">-30s</button>
          <button type="button" @click="stepWork(-5)" :disabled="!canStepWork(-5)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">-5s</button>
          <input
            v-model="form.workMinutes"
            type="number"
            min="0"
            placeholder="15"
            class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">:</span>
          <input
            v-model="form.workSeconds"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <button type="button" @click="stepWork(5)" :disabled="!canStepWork(5)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">+5s</button>
          <button type="button" @click="stepWork(30)" :disabled="!canStepWork(30)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">+30s</button>
        </div>
      </div>

      <!-- Rest Time (timed, not AMRAP) with steppers -->
      <div v-if="showRestTime">
        <label class="block text-sm text-white/70 mb-1">Tiempo de descanso</label>
        <div class="flex items-center gap-1">
          <button type="button" @click="stepRest(-30)" :disabled="!canStepRest(-30)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">-30s</button>
          <button type="button" @click="stepRest(-5)" :disabled="!canStepRest(-5)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">-5s</button>
          <input
            v-model="form.restMinutes"
            type="number"
            min="0"
            placeholder="0"
            class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">:</span>
          <input
            v-model="form.restSeconds"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <button type="button" @click="stepRest(5)" :disabled="!canStepRest(5)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">+5s</button>
          <button type="button" @click="stepRest(30)" :disabled="!canStepRest(30)"
            class="px-2 py-3 text-xs text-white/50 hover:text-white disabled:opacity-20 transition-colors">+30s</button>
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

      <!-- Block-level reps: sameReps -->
      <div v-if="showBlockReps && form.subtype === 'sameReps'">
        <label class="block text-sm text-white/70 mb-1">Reps por ronda</label>
        <input
          v-model="form.repsEveryRound"
          type="number"
          min="1"
          placeholder="Ej. 10"
          class="w-32 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
      </div>

      <!-- Block-level reps: perRound (dynamic inputs) -->
      <div v-if="showBlockReps && form.subtype === 'perRound'" class="space-y-3">
        <label class="block text-sm text-white/70 mb-1">Reps por ronda</label>
        <div class="flex flex-wrap gap-2 items-end">
          <div v-for="(_, rIndex) in form.repsPerRound" :key="rIndex" class="flex items-center gap-1">
            <div class="text-center">
              <span class="block text-xs text-white/40 mb-1">R{{ rIndex + 1 }}</span>
              <input
                v-model="form.repsPerRound[rIndex]"
                type="number"
                min="1"
                placeholder="0"
                class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange"
              />
            </div>
            <button
              v-if="form.repsPerRound.length > 1"
              type="button"
              @click="removeRepsRound(rIndex)"
              class="text-red-400/50 hover:text-red-400 p-0.5 mt-5"
            ><TrashIcon class="w-3.5 h-3.5" /></button>
          </div>
          <button
            type="button"
            @click="addRepsRound"
            class="rounded-lg border border-dashed border-white/20 px-3 py-2 text-white/50 hover:text-white hover:border-white/40 text-sm transition-colors mt-5"
          >+</button>
        </div>
      </div>

      <!-- Exercises -->
      <div>
        <label class="block text-sm text-white/70 mb-3">Ejercicios</label>
        <draggable
          v-model="form.exercises"
          item-key="_id"
          handle=".drag-handle"
          ghost-class="opacity-30"
          :animation="200"
          class="space-y-3"
        >
          <template #item="{ element: exercise, index }">
            <div class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Bars2Icon class="drag-handle w-5 h-5 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing shrink-0" />
                  <span class="text-white/50 text-sm font-medium">#{{ index + 1 }}</span>
                </div>
                <button
                  type="button"
                  @click="removeExercise(index)"
                  :disabled="form.exercises.length === 1"
                  class="text-red-400/70 hover:text-red-400 disabled:opacity-20 p-1"
                ><TrashIcon class="w-4 h-4" /></button>
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
                  <label class="block text-xs text-white/50 mb-1">Reps <span v-if="exerciseRepsRequired" class="text-gymOrange">*</span></label>
                  <input
                    v-model="exercise.repsEveryRound"
                    type="number"
                    min="1"
                    :placeholder="exerciseRepsRequired ? 'Obligatorio' : '—'"
                    class="w-full bg-white/10 border rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-gymOrange"
                    :class="exerciseRepsRequired && !exercise.repsEveryRound ? 'border-gymOrange/50' : 'border-white/20'"
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
          </template>
        </draggable>

        <div class="mt-3 flex gap-2">
          <button
            type="button"
            @click="openExercisePicker"
            class="flex-1 border border-gymOrange/30 bg-gymOrange/10 rounded-lg py-3 text-gymOrange/80 hover:text-gymOrange hover:border-gymOrange/50 text-sm transition-colors"
          >
            Añadir ejercicios
          </button>
          <button
            type="button"
            @click="addExercise"
            class="w-12 border border-dashed border-white/20 rounded-lg py-3 text-white/50 hover:text-white hover:border-white/40 text-sm transition-colors"
          >
            +
          </button>
        </div>
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
