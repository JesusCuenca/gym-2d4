<script setup>
import { computed, watch } from 'vue'
import { BLOCK_TYPES, TIMED_SUBTYPES, REPS_SUBTYPES, isTimed } from '../models/blockTypes'
import { Bars2Icon, TrashIcon } from '@heroicons/vue/20/solid'
import { useExercisePicker } from '../composables/useExercisePicker'
import draggable from 'vuedraggable'
import { createEmptyExercise } from '../utils/blockForm'
import TagSelector from './TagSelector.vue'
import { BLOCK_TAG_GROUPS } from '../utils/tags'

const props = defineProps({
  form: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const { pickExercises } = useExercisePicker()

// Size tokens — normal vs compact
const sz = computed(() => {
  const c = props.compact
  return {
    label: c ? 'text-xs text-white/60' : 'text-sm text-white/70',
    nameInput: c ? 'px-3 py-2 text-sm' : 'px-4 py-3',
    typeBtn: c ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
    subtypeBtn: c ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    stepBtn: c ? 'px-1.5 py-2 text-xs' : 'px-2 py-3 text-xs',
    timeInput: c ? 'w-14 px-2 py-2 text-sm' : 'w-16 px-2 py-3',
    roundsInput: c ? 'w-24 px-3 py-2 text-sm' : 'w-32 px-4 py-3',
    repsInput: c ? 'w-24 px-3 py-2 text-sm' : 'w-32 px-4 py-3',
    perRoundInput: c ? 'w-14 px-1.5 py-1.5 text-sm' : 'w-16 px-2 py-2 text-sm',
    perRoundGap: c ? 'gap-0.5' : 'gap-1',
    perRoundTrashMt: c ? 'mt-4' : 'mt-5',
    perRoundAddBtn: c ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
    exCard: c ? 'p-3 space-y-2' : 'p-4 space-y-3',
    exHeaderGap: c ? 'gap-1.5' : 'gap-2',
    exDragIcon: c ? 'w-4 h-4' : 'w-5 h-5',
    exNum: c ? 'text-xs text-white/50' : 'text-sm text-white/60',
    exTrashBtn: c ? 'p-0.5' : 'p-1',
    exTrashIcon: c ? 'w-3.5 h-3.5' : 'w-4 h-4',
    exNameInput: c ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-sm',
    exSubLabel: c ? 'text-xs text-white/50 mb-0.5' : 'text-xs text-white/60 mb-1',
    exRepsW: c ? 'w-24' : 'w-32',
    exRepsInput: c ? 'px-2 py-1.5 text-sm' : 'px-3 py-2 text-sm',
    exNotesInput: c ? 'px-2 py-1.5 text-sm' : 'px-3 py-2 text-sm',
    exBtnsGap: c ? 'mt-2' : 'mt-3',
    addPickerBtn: c ? 'py-2 text-xs' : 'py-3 text-sm',
    addPlusBtn: c ? 'w-10 py-2 text-xs' : 'w-12 py-3 text-sm',
  }
})

// Visibility computeds
const isTimedType = computed(() => isTimed(props.form.type))
const showWorkTime = computed(() => isTimedType.value)
const showRestTime = computed(() => isTimedType.value && props.form.subtype !== 'amrap')
const showRounds = computed(() => {
  if (isTimedType.value) return props.form.subtype !== 'amrap'
  return props.form.subtype !== 'perRound'
})
const showExerciseMode = computed(() => isTimedType.value && props.form.subtype === 'custom')
const showBlockReps = computed(() => !isTimedType.value)
const showExerciseReps = computed(() => {
  if (isTimedType.value) return props.form.exerciseMode === 'all'
  return props.form.subtype === 'perExercise'
})
const exerciseRepsRequired = computed(() => {
  if (isTimedType.value) return ['amrap', 'emom'].includes(props.form.subtype)
  return props.form.subtype === 'perExercise'
})
const workTimeLabel = computed(() =>
  props.form.subtype === 'amrap' ? 'Tiempo total' : 'Tiempo de trabajo'
)

// Time steppers
const WORK_MIN = 10
const WORK_MAX = 3600
const REST_MIN = 0
const REST_MAX = 600

function getWorkTotal() {
  return parseInt(props.form.workMinutes || 0) * 60 + parseInt(props.form.workSeconds || 0)
}
function setWorkTotal(total) {
  total = Math.max(WORK_MIN, Math.min(WORK_MAX, total))
  props.form.workMinutes = String(Math.floor(total / 60))
  props.form.workSeconds = String(total % 60).padStart(2, '0')
}
function getRestTotal() {
  return parseInt(props.form.restMinutes || 0) * 60 + parseInt(props.form.restSeconds || 0)
}
function setRestTotal(total) {
  total = Math.max(REST_MIN, Math.min(REST_MAX, total))
  props.form.restMinutes = String(Math.floor(total / 60))
  props.form.restSeconds = String(total % 60).padStart(2, '0')
}
function stepWork(delta) { setWorkTotal(getWorkTotal() + delta) }
function stepRest(delta) { setRestTotal(getRestTotal() + delta) }
function canStepWork(delta) { const n = getWorkTotal() + delta; return n >= WORK_MIN && n <= WORK_MAX }
function canStepRest(delta) { const n = getRestTotal() + delta; return n >= REST_MIN && n <= REST_MAX }

// Subtype selection with preset defaults
function selectSubtype(subtypeValue) {
  props.form.subtype = subtypeValue
  const entry = TIMED_SUBTYPES.find((p) => p.value === subtypeValue)
  if (!entry?.defaults) return
  if (entry.defaults.rounds != null) props.form.rounds = String(entry.defaults.rounds)
  if (entry.defaults.restSeconds != null) {
    props.form.restMinutes = String(Math.floor(entry.defaults.restSeconds / 60))
    props.form.restSeconds = String(entry.defaults.restSeconds % 60).padStart(2, '0')
  }
  if (entry.defaults.workSeconds != null) {
    props.form.workMinutes = String(Math.floor(entry.defaults.workSeconds / 60))
    props.form.workSeconds = String(entry.defaults.workSeconds % 60).padStart(2, '0')
  }
  if (entry.defaults.exerciseMode) props.form.exerciseMode = entry.defaults.exerciseMode
}

// Reset subtype when type changes
watch(() => props.form.type, (newType) => {
  props.form.subtype = isTimed(newType) ? 'custom' : 'sameReps'
})

// Reps per round
function addRepsRound() { props.form.repsPerRound.push('') }
function removeRepsRound(index) {
  if (props.form.repsPerRound.length > 1) props.form.repsPerRound.splice(index, 1)
}

// Exercises
function addExercise() { props.form.exercises.push(createEmptyExercise()) }
function removeExercise(index) {
  if (props.form.exercises.length > 1) props.form.exercises.splice(index, 1)
}

async function openExercisePicker() {
  const picked = await pickExercises()
  if (!picked.length) return
  const withIds = picked.map((ex) => ({ ...createEmptyExercise(), ...ex }))
  const hasOnlyEmpty = props.form.exercises.length === 1 && !props.form.exercises[0].name
  if (hasOnlyEmpty) {
    props.form.exercises = withIds
  } else {
    props.form.exercises.push(...withIds)
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Block Name -->
    <div>
      <label :class="['block mb-1', sz.label]">Nombre del bloque</label>
      <input v-model="form.name" type="text" placeholder="Ej. AMRAP 15 min" :disabled="props.readonly"
        :class="['w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.nameInput]" />
    </div>

    <!-- Block Type -->
    <div>
      <label :class="['block mb-1', sz.label]">Tipo</label>
      <div class="flex gap-2">
        <button v-for="bt in BLOCK_TYPES" :key="bt.value" type="button" @click="form.type = bt.value"
          :disabled="props.readonly" :class="['flex-1 rounded-lg font-bold transition-colors border disabled:cursor-default', sz.typeBtn,
            form.type === bt.value
              ? 'bg-gymOrange text-white border-gymOrange'
              : 'bg-white/5 text-white/70 border-white/20 hover:border-white/40']">
          {{ bt.label }}
        </button>
      </div>
    </div>

    <!-- Timed Subtypes -->
    <div v-if="isTimedType">
      <label :class="['block mb-1', sz.label]">Subtipo</label>
      <div class="flex gap-2">
        <button v-for="st in TIMED_SUBTYPES" :key="st.value" type="button" @click="selectSubtype(st.value)"
          :disabled="props.readonly" :class="['rounded-lg font-bold transition-colors border disabled:cursor-default', sz.subtypeBtn,
            form.subtype === st.value
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30']">
          {{ st.label }}
        </button>
      </div>
    </div>

    <!-- Reps Subtypes -->
    <div v-if="showBlockReps">
      <label :class="['block mb-1', sz.label]">Subtipo</label>
      <div class="flex gap-2">
        <button v-for="st in REPS_SUBTYPES" :key="st.value" type="button" @click="form.subtype = st.value"
          :disabled="props.readonly" :class="['rounded-lg font-bold transition-colors border disabled:cursor-default', sz.subtypeBtn,
            form.subtype === st.value
              ? 'bg-white/20 text-white border-white/40'
              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30']">
          {{ st.label }}
        </button>
      </div>
    </div>

    <!-- Work Time with steppers -->
    <div v-if="showWorkTime">
      <label :class="['block mb-1', sz.label]">{{ workTimeLabel }}</label>
      <div class="flex items-center gap-1">
        <template v-if="!props.readonly">
          <button type="button" @click="stepWork(-30)" :disabled="!canStepWork(-30)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">-30s</button>
          <button type="button" @click="stepWork(-5)" :disabled="!canStepWork(-5)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">-5s</button>
        </template>
        <input v-model="form.workMinutes" type="number" min="0" placeholder="15" :disabled="props.readonly"
          :class="['bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.timeInput]" />
        <span class="text-white/60">:</span>
        <input v-model="form.workSeconds" type="number" min="0" max="59" placeholder="00" :disabled="props.readonly"
          :class="['bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.timeInput]" />
        <template v-if="!props.readonly">
          <button type="button" @click="stepWork(5)" :disabled="!canStepWork(5)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">+5s</button>
          <button type="button" @click="stepWork(30)" :disabled="!canStepWork(30)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">+30s</button>
        </template>
      </div>
    </div>

    <!-- Rest Time with steppers -->
    <div v-if="showRestTime">
      <label :class="['block mb-1', sz.label]">Tiempo de descanso</label>
      <div class="flex items-center gap-1">
        <template v-if="!props.readonly">
          <button type="button" @click="stepRest(-30)" :disabled="!canStepRest(-30)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">-30s</button>
          <button type="button" @click="stepRest(-5)" :disabled="!canStepRest(-5)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">-5s</button>
        </template>
        <input v-model="form.restMinutes" type="number" min="0" placeholder="0" :disabled="props.readonly"
          :class="['bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.timeInput]" />
        <span class="text-white/60">:</span>
        <input v-model="form.restSeconds" type="number" min="0" max="59" placeholder="00" :disabled="props.readonly"
          :class="['bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.timeInput]" />
        <template v-if="!props.readonly">
          <button type="button" @click="stepRest(5)" :disabled="!canStepRest(5)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">+5s</button>
          <button type="button" @click="stepRest(30)" :disabled="!canStepRest(30)"
            :class="['text-white/60 hover:text-white disabled:opacity-40 transition-colors', sz.stepBtn]">+30s</button>
        </template>
      </div>
    </div>

    <!-- Rounds -->
    <div v-if="showRounds">
      <label :class="['block mb-1', sz.label]">Rondas</label>
      <input v-model="form.rounds" type="number" min="1" placeholder="Ej. 5" :disabled="props.readonly"
        :class="['bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.roundsInput]" />
    </div>

    <!-- Exercise Mode (timed, custom only) -->
    <div v-if="showExerciseMode">
      <label :class="['block mb-1', sz.label]">Modo de ejercicios</label>
      <div class="flex gap-2">
        <button type="button" @click="form.exerciseMode = 'all'" :disabled="props.readonly" :class="['flex-1 rounded-lg font-bold transition-colors border disabled:cursor-default', sz.subtypeBtn,
          form.exerciseMode === 'all'
            ? 'bg-white/20 text-white border-white/40'
            : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30']">
          Todos a la vez
        </button>
        <button type="button" @click="form.exerciseMode = 'rotate'" :disabled="props.readonly" :class="['flex-1 rounded-lg font-bold transition-colors border disabled:cursor-default', sz.subtypeBtn,
          form.exerciseMode === 'rotate'
            ? 'bg-white/20 text-white border-white/40'
            : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30']">
          Uno por uno
        </button>
      </div>
    </div>

    <!-- Block-level reps: sameReps -->
    <div v-if="showBlockReps && form.subtype === 'sameReps'">
      <label :class="['block mb-1', sz.label]">Reps por ronda</label>
      <input v-model="form.repsEveryRound" type="number" min="1" placeholder="Ej. 10" :disabled="props.readonly"
        :class="['bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.repsInput]" />
    </div>

    <!-- Block-level reps: perRound (dynamic inputs) -->
    <div v-if="showBlockReps && form.subtype === 'perRound'" class="space-y-2">
      <label :class="['block mb-1', sz.label]">Reps por ronda</label>
      <div :class="['flex flex-wrap items-end', sz.perRoundGap]">
        <div v-for="(_, rIndex) in form.repsPerRound" :key="rIndex" :class="['flex items-center', sz.perRoundGap]">
          <div class="text-center">
            <span class="block text-xs text-white/50 mb-0.5">R{{ rIndex + 1 }}</span>
            <input v-model="form.repsPerRound[rIndex]" type="number" min="1" placeholder="0" :disabled="props.readonly"
              :class="['bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.perRoundInput]" />
          </div>
          <button v-if="!props.readonly && form.repsPerRound.length > 1" type="button" @click="removeRepsRound(rIndex)"
            :class="['text-red-400/50 hover:text-red-400 p-0.5', sz.perRoundTrashMt]">
            <TrashIcon :class="['shrink-0', sz.exTrashIcon]" />
          </button>
        </div>
        <button v-if="!props.readonly" type="button" @click="addRepsRound"
          :class="['rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors', sz.perRoundAddBtn, sz.perRoundTrashMt]">+</button>
      </div>
    </div>

    <!-- Exercises -->
    <div>
      <label :class="['block mb-2', sz.label]">Ejercicios</label>
      <draggable v-model="form.exercises" item-key="_id" handle=".block-form-drag-handle" ghost-class="opacity-30"
        :animation="200" :disabled="props.readonly" class="space-y-2">
        <template #item="{ element: exercise, index }">
          <div :class="['bg-white/5 border border-white/10 rounded-lg', sz.exCard]">
            <div :class="['flex items-center justify-between']">
              <div :class="['flex items-center', sz.exHeaderGap]">
                <Bars2Icon v-if="!props.readonly"
                  :class="['block-form-drag-handle text-white/50 hover:text-white/60 cursor-grab active:cursor-grabbing shrink-0', sz.exDragIcon]" />
                <span :class="['font-medium', sz.exNum]">#{{ index + 1 }}</span>
              </div>
              <button v-if="!props.readonly" type="button" @click="removeExercise(index)"
                :disabled="form.exercises.length === 1"
                :class="['text-red-400/70 hover:text-red-400 disabled:opacity-40', sz.exTrashBtn]">
                <TrashIcon :class="sz.exTrashIcon" />
              </button>
            </div>

            <input v-model="exercise.name" type="text" placeholder="Nombre del ejercicio" :disabled="props.readonly"
              :class="['w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.exNameInput]" />

            <div class="flex gap-2">
              <div v-if="showExerciseReps" :class="sz.exRepsW">
                <label :class="['block', sz.exSubLabel]">Reps</label>
                <input v-model="exercise.repsEveryRound" type="number" min="1"
                  :placeholder="exerciseRepsRequired ? 'Req.' : '—'" :disabled="props.readonly" :class="['w-full bg-white/10 border rounded-lg text-white text-center focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.exRepsInput,
                    exerciseRepsRequired && !exercise.repsEveryRound ? 'border-gymOrange/50' : 'border-white/20']" />
              </div>
              <div class="flex-1">
                <label :class="['block', sz.exSubLabel]">Notas</label>
                <input v-model="exercise.notes" type="text" placeholder="Opcional" :disabled="props.readonly"
                  :class="['w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default', sz.exNotesInput]" />
              </div>
            </div>
          </div>
        </template>
      </draggable>

      <!-- Tags -->
      <div>
        <label :class="['block mb-1.5', sz.label]">Etiquetas</label>
        <TagSelector :tagGroups="BLOCK_TAG_GROUPS" :modelValue="form.tags || []" :compact="props.compact"
          :readonly="props.readonly" @update:modelValue="form.tags = $event" />
      </div>

      <div v-if="!props.readonly" :class="['flex gap-2', sz.exBtnsGap]">
        <button type="button" @click="openExercisePicker"
          :class="['flex-1 border border-gymOrange/30 bg-gymOrange/10 rounded-lg text-gymOrange/80 hover:text-gymOrange hover:border-gymOrange/50 transition-colors', sz.addPickerBtn]">
          Añadir ejercicios
        </button>
        <button type="button" @click="addExercise"
          :class="['border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors', sz.addPlusBtn]">
          +
        </button>
      </div>
    </div>
  </div>
</template>
