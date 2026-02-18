<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, TIMED_PRESETS, isTimed, getBlockLabel } from '../models/blockTypes'
import { ChevronUpIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const classStore = useClassStore()
const blockStore = useBlockStore()

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')
const name = ref('')
const description = ref('')
const classBlocks = ref([]) // { sourceBlockId, form, editing }
const showCatalog = ref(false)

// --- Helpers ---

function createEmptyExercise() {
  return { name: '', repsEveryRound: '', notes: '' }
}

function createEmptyForm() {
  return {
    name: '',
    type: 'timed',
    preset: null,
    workMinutes: '15',
    workSeconds: '00',
    restMinutes: '0',
    restSeconds: '00',
    rounds: '',
    exerciseMode: 'all',
    repsEveryRound: '',
    repsPerRound: '',
    exercises: [createEmptyExercise()],
  }
}

function blockDataToForm(bd) {
  return {
    name: bd.name || '',
    type: bd.type || 'timed',
    preset: bd.preset || null,
    workMinutes: bd.workSeconds != null ? String(Math.floor(bd.workSeconds / 60)) : '0',
    workSeconds: bd.workSeconds != null ? String(bd.workSeconds % 60).padStart(2, '0') : '00',
    restMinutes: bd.restSeconds != null ? String(Math.floor(bd.restSeconds / 60)) : '0',
    restSeconds: bd.restSeconds != null ? String(bd.restSeconds % 60).padStart(2, '0') : '00',
    rounds: bd.rounds ? String(bd.rounds) : '',
    exerciseMode: bd.exerciseMode || 'all',
    repsEveryRound: bd.repsEveryRound ? String(bd.repsEveryRound) : '',
    repsPerRound: bd.repsPerRound ? bd.repsPerRound.join(', ') : '',
    exercises: (bd.exercises?.length ? bd.exercises : [{ name: '' }]).map((ex) => ({
      name: ex.name || '',
      repsEveryRound: ex.repsEveryRound ? String(ex.repsEveryRound) : '',
      notes: ex.notes || '',
    })),
  }
}

function formToBlockData(form) {
  const blockData = { name: form.name, type: form.type }

  if (isTimed(form.type)) {
    blockData.preset = form.preset || null
    blockData.workSeconds = parseInt(form.workMinutes || 0) * 60 + parseInt(form.workSeconds || 0)
    blockData.restSeconds = form.preset === 'amrap' ? 0 : parseInt(form.restMinutes || 0) * 60 + parseInt(form.restSeconds || 0)
    blockData.rounds = form.preset === 'amrap' ? 1 : parseInt(form.rounds) || 1
    blockData.exerciseMode = form.exerciseMode
  } else {
    blockData.rounds = parseInt(form.rounds) || 1
    const repsPerRoundStr = (form.repsPerRound || '').trim()
    if (repsPerRoundStr) {
      blockData.repsPerRound = repsPerRoundStr.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
      blockData.rounds = blockData.repsPerRound.length
    } else {
      blockData.repsPerRound = null
    }
    blockData.repsEveryRound = form.repsEveryRound ? parseInt(form.repsEveryRound) : null
  }

  const showExReps = isTimed(form.type) ? form.exerciseMode === 'all' : true
  blockData.exercises = form.exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => ({
      name: ex.name,
      repsEveryRound: showExReps && ex.repsEveryRound ? parseInt(ex.repsEveryRound) : null,
      notes: ex.notes || null,
    }))

  return blockData
}

// --- Visibility helpers for inline form ---

function isFormTimed(form) { return isTimed(form.type) }
function showWorkTime(form) { return isTimed(form.type) }
function showRestTime(form) { return isTimed(form.type) && form.preset !== 'amrap' }
function showRounds(form) { return isTimed(form.type) ? form.preset !== 'amrap' : true }
function showExerciseMode(form) { return isTimed(form.type) && !form.preset }
function showBlockReps(form) { return !isTimed(form.type) }
function showExerciseReps(form) {
  if (isTimed(form.type)) return form.exerciseMode === 'all'
  return true
}

function workTimeLabel(form) {
  return form.preset === 'amrap' ? 'Tiempo total' : 'Tiempo de trabajo'
}

function selectPreset(form, presetValue) {
  if (form.preset === presetValue) {
    form.preset = null
    return
  }
  form.preset = presetValue
  const preset = TIMED_PRESETS.find((p) => p.value === presetValue)
  if (!preset) return
  if (preset.defaults.rounds != null) form.rounds = String(preset.defaults.rounds)
  if (preset.defaults.restSeconds != null) {
    form.restMinutes = String(Math.floor(preset.defaults.restSeconds / 60))
    form.restSeconds = String(preset.defaults.restSeconds % 60).padStart(2, '0')
  }
  if (preset.defaults.workSeconds != null) {
    form.workMinutes = String(Math.floor(preset.defaults.workSeconds / 60))
    form.workSeconds = String(preset.defaults.workSeconds % 60).padStart(2, '0')
  }
  if (preset.defaults.exerciseMode) form.exerciseMode = preset.defaults.exerciseMode
}

// --- Summary text for collapsed block ---

function blockSummary(form) {
  const parts = []
  const exCount = form.exercises?.filter((e) => e.name).length || 0
  if (exCount) parts.push(`${exCount} ejercicio${exCount !== 1 ? 's' : ''}`)
  if (isTimed(form.type)) {
    const work = parseInt(form.workMinutes || 0) * 60 + parseInt(form.workSeconds || 0)
    if (work) {
      const m = Math.floor(work / 60)
      const s = work % 60
      parts.push(s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`)
    }
  }
  if (form.rounds) parts.push(`${form.rounds} rondas`)
  if (form.repsPerRound) parts.push(form.repsPerRound)
  return parts.join(' · ')
}

// --- Block management ---

function addBlockFromCatalog(block) {
  classBlocks.value.push({
    sourceBlockId: block.id,
    form: blockDataToForm(block),
    editing: false,
  })
  showCatalog.value = false
}

function addNewBlock() {
  classBlocks.value.push({
    sourceBlockId: null,
    form: createEmptyForm(),
    editing: true,
  })
}

function removeBlock(index) {
  classBlocks.value.splice(index, 1)
}

function moveBlock(index, direction) {
  const target = index + direction
  if (target < 0 || target >= classBlocks.value.length) return
  const arr = classBlocks.value
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
}

function toggleEdit(index) {
  classBlocks.value[index].editing = !classBlocks.value[index].editing
}

// --- Exercise management within a block ---

function addExercise(blockIndex) {
  classBlocks.value[blockIndex].form.exercises.push(createEmptyExercise())
}

function removeExercise(blockIndex, exIndex) {
  const exercises = classBlocks.value[blockIndex].form.exercises
  if (exercises.length > 1) exercises.splice(exIndex, 1)
}

function moveExercise(blockIndex, exIndex, direction) {
  const target = exIndex + direction
  const exercises = classBlocks.value[blockIndex].form.exercises
  if (target < 0 || target >= exercises.length) return
  ;[exercises[exIndex], exercises[target]] = [exercises[target], exercises[exIndex]]
}

// --- Save block to library ---

async function saveToLibrary(blockIndex) {
  const blockData = formToBlockData(classBlocks.value[blockIndex].form)
  const blockId = await blockStore.createBlock(blockData)
  classBlocks.value[blockIndex].sourceBlockId = blockId
  await blockStore.fetchBlocks()
}

// --- Submit ---

async function handleSubmit() {
  validationError.value = ''
  if (classBlocks.value.length === 0) {
    validationError.value = 'Añade al menos un bloque a la clase.'
    return
  }
  const invalidBlock = classBlocks.value.find((cb) => !cb.form.name.trim())
  if (invalidBlock) {
    validationError.value = 'Todos los bloques deben tener un nombre.'
    return
  }
  const blockWithNoExercises = classBlocks.value.find(
    (cb) => !cb.form.exercises.some((ex) => ex.name.trim())
  )
  if (blockWithNoExercises) {
    validationError.value = `El bloque "${blockWithNoExercises.form.name || 'Sin nombre'}" necesita al menos un ejercicio.`
    return
  }

  submitting.value = true
  try {
    const classData = {
      name: name.value,
      description: description.value || null,
      blocks: classBlocks.value.map((cb, index) => ({
        blockId: cb.sourceBlockId || null,
        blockData: formToBlockData(cb.form),
        order: index,
      })),
    }

    if (isEditMode.value) {
      await classStore.updateClass(route.params.id, classData)
    } else {
      await classStore.createClass(classData)
    }

    router.push({ name: 'admin-classes' })
  } finally {
    submitting.value = false
  }
}

// --- Load ---

onMounted(async () => {
  loading.value = true
  await blockStore.fetchBlocks()
  if (isEditMode.value) {
    const cls = await classStore.getClassById(route.params.id)
    if (cls) {
      name.value = cls.name
      description.value = cls.description || ''
      classBlocks.value = (cls.blocks || []).map((b) => ({
        sourceBlockId: b.blockId,
        form: blockDataToForm(b.blockData),
        editing: false,
      }))
    }
  }
  loading.value = false
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar clase' : 'Crear clase' }}
    </h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Class Name -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Nombre de la clase</label>
        <input
          v-model="name"
          type="text"
          required
          placeholder="Ej. WOD Lunes"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Descripción (opcional)</label>
        <textarea
          v-model="description"
          rows="2"
          placeholder="Breve descripción de la clase"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange resize-none"
        />
      </div>

      <!-- Class Blocks -->
      <div>
        <label class="block text-sm text-white/70 mb-3">
          Bloques de la clase ({{ classBlocks.length }})
        </label>

        <!-- Empty state -->
        <div
          v-if="classBlocks.length === 0"
          class="text-white/30 text-sm py-4 text-center border border-dashed border-white/10 rounded-lg"
        >
          Aún no hay bloques. Añade bloques del catálogo o crea uno nuevo.
        </div>

        <!-- Block list -->
        <div v-else class="space-y-3 mb-4">
          <div
            v-for="(cb, bIndex) in classBlocks"
            :key="bIndex"
            class="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
          >
            <!-- Block header (always visible) -->
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-gymOrange font-bold text-sm w-6">{{ bIndex + 1 }}</span>
              <div class="flex-1 min-w-0">
                <span class="text-white font-medium text-sm truncate block">
                  {{ cb.form.name || 'Sin nombre' }}
                </span>
                <span class="text-white/40 text-xs">
                  {{ cb.form.preset ? TIMED_PRESETS.find(p => p.value === cb.form.preset)?.label : BLOCK_TYPES.find(bt => bt.value === cb.form.type)?.label }}
                  <span v-if="blockSummary(cb.form)"> · {{ blockSummary(cb.form) }}</span>
                </span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <button type="button" @click="moveBlock(bIndex, -1)" :disabled="bIndex === 0"
                  class="text-white/30 hover:text-white disabled:opacity-20 p-1"><ChevronUpIcon class="w-4 h-4" /></button>
                <button type="button" @click="moveBlock(bIndex, 1)" :disabled="bIndex === classBlocks.length - 1"
                  class="text-white/30 hover:text-white disabled:opacity-20 p-1"><ChevronDownIcon class="w-4 h-4" /></button>
                <button type="button" @click="toggleEdit(bIndex)"
                  class="text-gymOrange/70 hover:text-gymOrange p-1 ml-1"><PencilSquareIcon class="w-4 h-4" /></button>
                <button type="button" @click="removeBlock(bIndex)"
                  class="text-red-400/70 hover:text-red-400 p-1 ml-1"><XMarkIcon class="w-4 h-4" /></button>
              </div>
            </div>

            <!-- Inline block editor (collapsible) -->
            <div v-if="cb.editing" class="border-t border-white/10 px-4 py-4 space-y-4 bg-white/[0.02]">
              <!-- Block Name -->
              <div>
                <label class="block text-xs text-white/50 mb-1">Nombre del bloque</label>
                <input
                  v-model="cb.form.name"
                  type="text"
                  placeholder="Ej. AMRAP 15 min"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
                />
              </div>

              <!-- Block Type -->
              <div>
                <label class="block text-xs text-white/50 mb-1">Tipo</label>
                <div class="flex gap-2">
                  <button
                    v-for="bt in BLOCK_TYPES"
                    :key="bt.value"
                    type="button"
                    @click="cb.form.type = bt.value; cb.form.preset = null"
                    class="flex-1 rounded-lg px-3 py-2 font-bold text-xs transition-colors border"
                    :class="cb.form.type === bt.value
                      ? 'bg-gymOrange text-white border-gymOrange'
                      : 'bg-white/5 text-white/70 border-white/20 hover:border-white/40'"
                  >
                    {{ bt.label }}
                  </button>
                </div>
              </div>

              <!-- Timed Presets -->
              <div v-if="isFormTimed(cb.form)">
                <label class="block text-xs text-white/50 mb-1">Configuración rápida</label>
                <div class="flex gap-2">
                  <button
                    v-for="p in TIMED_PRESETS"
                    :key="p.value"
                    type="button"
                    @click="selectPreset(cb.form, p.value)"
                    class="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors border"
                    :class="cb.form.preset === p.value
                      ? 'bg-white/20 text-white border-white/40'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'"
                  >
                    {{ p.label }}
                  </button>
                </div>
              </div>

              <!-- Work Time -->
              <div v-if="showWorkTime(cb.form)">
                <label class="block text-xs text-white/50 mb-1">{{ workTimeLabel(cb.form) }}</label>
                <div class="flex items-center gap-2">
                  <input v-model="cb.form.workMinutes" type="number" min="0" placeholder="15"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">min</span>
                  <input v-model="cb.form.workSeconds" type="number" min="0" max="59" placeholder="00"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">seg</span>
                </div>
              </div>

              <!-- Rest Time -->
              <div v-if="showRestTime(cb.form)">
                <label class="block text-xs text-white/50 mb-1">Tiempo de descanso</label>
                <div class="flex items-center gap-2">
                  <input v-model="cb.form.restMinutes" type="number" min="0" placeholder="0"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">min</span>
                  <input v-model="cb.form.restSeconds" type="number" min="0" max="59" placeholder="00"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">seg</span>
                </div>
              </div>

              <!-- Rounds -->
              <div v-if="showRounds(cb.form)">
                <label class="block text-xs text-white/50 mb-1">Rondas</label>
                <input v-model="cb.form.rounds" type="number" min="1" placeholder="Ej. 5"
                  class="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
              </div>

              <!-- Exercise Mode -->
              <div v-if="showExerciseMode(cb.form)">
                <label class="block text-xs text-white/50 mb-1">Modo de ejercicios</label>
                <div class="flex gap-2">
                  <button type="button" @click="cb.form.exerciseMode = 'all'"
                    class="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors border"
                    :class="cb.form.exerciseMode === 'all'
                      ? 'bg-white/20 text-white border-white/40'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'">
                    Todos a la vez
                  </button>
                  <button type="button" @click="cb.form.exerciseMode = 'rotate'"
                    class="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors border"
                    :class="cb.form.exerciseMode === 'rotate'
                      ? 'bg-white/20 text-white border-white/40'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'">
                    Uno por uno
                  </button>
                </div>
              </div>

              <!-- Block-level reps (reps type) -->
              <div v-if="showBlockReps(cb.form)" class="space-y-3">
                <div>
                  <label class="block text-xs text-white/50 mb-1">Reps por ronda (todas iguales)</label>
                  <input v-model="cb.form.repsEveryRound" type="number" min="1" placeholder="Ej. 10"
                    class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
                </div>
                <div>
                  <label class="block text-xs text-white/50 mb-1">Reps por ronda (variable)</label>
                  <input v-model="cb.form.repsPerRound" type="text" placeholder="Ej. 21, 15, 9"
                    class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
                </div>
              </div>

              <!-- Exercises -->
              <div>
                <label class="block text-xs text-white/50 mb-2">Ejercicios</label>
                <div class="space-y-2">
                  <div
                    v-for="(ex, eIndex) in cb.form.exercises"
                    :key="eIndex"
                    class="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-white/40 text-xs font-medium">#{{ eIndex + 1 }}</span>
                      <div class="flex items-center gap-1">
                        <button type="button" @click="moveExercise(bIndex, eIndex, -1)" :disabled="eIndex === 0"
                          class="text-white/30 hover:text-white disabled:opacity-20 p-0.5"><ChevronUpIcon class="w-3.5 h-3.5" /></button>
                        <button type="button" @click="moveExercise(bIndex, eIndex, 1)" :disabled="eIndex === cb.form.exercises.length - 1"
                          class="text-white/30 hover:text-white disabled:opacity-20 p-0.5"><ChevronDownIcon class="w-3.5 h-3.5" /></button>
                        <button type="button" @click="removeExercise(bIndex, eIndex)" :disabled="cb.form.exercises.length === 1"
                          class="text-red-400/70 hover:text-red-400 disabled:opacity-20 p-0.5"><TrashIcon class="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <input v-model="ex.name" type="text" placeholder="Nombre del ejercicio"
                      class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />

                    <div class="flex gap-2">
                      <div v-if="showExerciseReps(cb.form)" class="w-24">
                        <label class="block text-xs text-white/40 mb-0.5">Reps</label>
                        <input v-model="ex.repsEveryRound" type="number" min="1" placeholder="—"
                          class="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-gymOrange" />
                      </div>
                      <div class="flex-1">
                        <label class="block text-xs text-white/40 mb-0.5">Notas</label>
                        <input v-model="ex.notes" type="text" placeholder="Opcional"
                          class="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
                      </div>
                    </div>
                  </div>
                </div>

                <button type="button" @click="addExercise(bIndex)"
                  class="mt-2 w-full border border-dashed border-white/20 rounded-lg py-2 text-white/50 hover:text-white hover:border-white/40 text-xs transition-colors">
                  + Añadir ejercicio
                </button>
              </div>

              <!-- Save to library -->
              <div v-if="!cb.sourceBlockId" class="pt-2 border-t border-white/10">
                <button type="button" @click="saveToLibrary(bIndex)"
                  class="text-xs text-gymOrange/70 hover:text-gymOrange transition-colors">
                  Guardar en el catálogo de bloques
                </button>
              </div>
              <div v-else class="pt-2 border-t border-white/10">
                <span class="text-xs text-white/30">Basado en bloque del catálogo (los cambios solo afectan a esta clase)</span>
              </div>

              <!-- Close editor -->
              <button type="button" @click="toggleEdit(bIndex)"
                class="w-full text-center text-xs text-white/40 hover:text-white/70 py-1 transition-colors">
                Cerrar editor
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add block actions -->
      <div class="flex gap-2">
        <button
          type="button"
          @click="showCatalog = !showCatalog"
          class="flex-1 border border-dashed border-white/20 rounded-lg py-3 text-white/50 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          {{ showCatalog ? 'Ocultar catálogo' : '+ Añadir del catálogo' }}
        </button>
        <button
          type="button"
          @click="addNewBlock"
          class="flex-1 border border-dashed border-gymOrange/30 rounded-lg py-3 text-gymOrange/70 hover:text-gymOrange hover:border-gymOrange/50 text-sm transition-colors"
        >
          + Crear bloque nuevo
        </button>
      </div>

      <!-- Block catalog (collapsible) -->
      <div v-if="showCatalog">
        <label class="block text-sm text-white/70 mb-3">Catálogo de bloques</label>

        <div v-if="blockStore.loading" class="text-white/50 text-sm text-center py-4">
          Cargando bloques...
        </div>

        <div v-else-if="blockStore.blocks.length === 0" class="text-white/30 text-sm py-4 text-center border border-dashed border-white/10 rounded-lg">
          No hay bloques en el catálogo. Puedes crear uno nuevo arriba.
        </div>

        <div v-else class="grid gap-2">
          <button
            v-for="block in blockStore.blocks"
            :key="block.id"
            type="button"
            @click="addBlockFromCatalog(block)"
            class="text-left bg-white/5 border border-white/10 hover:border-white/30 rounded-lg px-4 py-3 transition-colors"
          >
            <div class="flex items-center justify-between">
              <span class="text-white text-sm font-medium">{{ block.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {{ getBlockLabel(block) }}
              </span>
            </div>
            <span class="text-white/40 text-xs">
              {{ block.exercises?.length || 0 }} ejercicio{{ (block.exercises?.length || 0) !== 1 ? 's' : '' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Validation error -->
      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <!-- Submit -->
      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          :disabled="submitting || classBlocks.length === 0"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Guardando...' : isEditMode ? 'Actualizar clase' : 'Crear clase' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-classes' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
