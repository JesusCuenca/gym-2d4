<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, isTimeBased, getFamilyForType } from '../models/blockTypes'

const router = useRouter()
const route = useRoute()
const classStore = useClassStore()
const blockStore = useBlockStore()

const isEditMode = computed(() => !!route.params.id)
const submitting = ref(false)
const validationError = ref('')
const name = ref('')
const description = ref('')
const classBlocks = ref([]) // { sourceBlockId, form, editing }
const showCatalog = ref(false)

// --- Helpers ---

function getTypeLabel(type) {
  return BLOCK_TYPES.find((bt) => bt.value === type)?.label ?? type
}

function createEmptyExercise() {
  return { name: '', reps: '', timeSeconds: '', weight: '', notes: '' }
}

function createEmptyForm() {
  return {
    name: '',
    type: 'amrap',
    timeCapMinutes: '15',
    timeCapSeconds: '00',
    rounds: '',
    intervalMinutes: '1',
    intervalSeconds: '00',
    repScheme: '',
    exercises: [createEmptyExercise()],
  }
}

function blockDataToForm(bd) {
  return {
    name: bd.name || '',
    type: bd.type || 'amrap',
    timeCapMinutes: bd.timeCapSeconds ? String(Math.floor(bd.timeCapSeconds / 60)) : '0',
    timeCapSeconds: bd.timeCapSeconds ? String(bd.timeCapSeconds % 60).padStart(2, '0') : '00',
    rounds: bd.rounds ? String(bd.rounds) : '',
    intervalMinutes: bd.intervalSeconds ? String(Math.floor(bd.intervalSeconds / 60)) : '1',
    intervalSeconds: bd.intervalSeconds ? String(bd.intervalSeconds % 60).padStart(2, '0') : '00',
    repScheme: bd.repScheme || '',
    exercises: (bd.exercises?.length ? bd.exercises : [{ name: '' }]).map((ex) => ({
      name: ex.name || '',
      reps: ex.reps ? String(ex.reps) : '',
      timeSeconds: ex.timeSeconds ? String(ex.timeSeconds) : '',
      weight: ex.weight || '',
      notes: ex.notes || '',
    })),
  }
}

function formToBlockData(form) {
  const timeBased = isTimeBased(form.type)
  const isEmom = form.type === 'emom'
  const showRounds = ['emom', 'strength', 'tabata'].includes(form.type)

  return {
    name: form.name,
    type: form.type,
    family: getFamilyForType(form.type),
    timeCapSeconds: timeBased
      ? parseInt(form.timeCapMinutes || 0) * 60 + parseInt(form.timeCapSeconds || 0)
      : null,
    rounds: showRounds ? parseInt(form.rounds) || null : null,
    intervalSeconds: isEmom
      ? parseInt(form.intervalMinutes || 0) * 60 + parseInt(form.intervalSeconds || 0)
      : null,
    repScheme: !timeBased ? form.repScheme || null : null,
    exercises: form.exercises.map((ex) => ({
      name: ex.name,
      reps: ex.reps ? parseInt(ex.reps) : null,
      timeSeconds: ex.timeSeconds ? parseInt(ex.timeSeconds) : null,
      weight: ex.weight || null,
      notes: ex.notes || null,
    })),
  }
}

// --- Block type visibility ---

function showTimeCap(type) { return isTimeBased(type) }
function showInterval(type) { return type === 'emom' }
function showRepScheme(type) { return !isTimeBased(type) }
function showRounds(type) { return ['emom', 'strength', 'tabata'].includes(type) }

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

// --- Summary text for collapsed block ---

function blockSummary(form) {
  const parts = []
  const exCount = form.exercises?.filter((e) => e.name).length || 0
  if (exCount) parts.push(`${exCount} ejercicio${exCount !== 1 ? 's' : ''}`)
  if (isTimeBased(form.type) && (form.timeCapMinutes > 0 || form.timeCapSeconds > 0)) {
    const mins = parseInt(form.timeCapMinutes || 0)
    const secs = parseInt(form.timeCapSeconds || 0)
    if (mins || secs) parts.push(`${mins}:${String(secs).padStart(2, '0')}`)
  }
  if (form.rounds) parts.push(`${form.rounds} rondas`)
  if (form.repScheme) parts.push(form.repScheme)
  return parts.join(' · ')
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
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar clase' : 'Crear clase' }}
    </h1>

    <form @submit.prevent="handleSubmit" class="space-y-6">
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
                  {{ getTypeLabel(cb.form.type) }}
                  <span v-if="blockSummary(cb.form)"> · {{ blockSummary(cb.form) }}</span>
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" @click="moveBlock(bIndex, -1)" :disabled="bIndex === 0"
                  class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-sm">↑</button>
                <button type="button" @click="moveBlock(bIndex, 1)" :disabled="bIndex === classBlocks.length - 1"
                  class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-sm">↓</button>
                <button type="button" @click="toggleEdit(bIndex)"
                  class="text-gymOrange/70 hover:text-gymOrange px-1 text-sm ml-1">✎</button>
                <button type="button" @click="removeBlock(bIndex)"
                  class="text-red-400/70 hover:text-red-400 px-1 text-sm ml-1">✕</button>
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
                <select
                  v-model="cb.form.type"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gymOrange"
                >
                  <option v-for="bt in BLOCK_TYPES" :key="bt.value" :value="bt.value">
                    {{ bt.label }}
                  </option>
                </select>
              </div>

              <!-- Time Cap -->
              <div v-if="showTimeCap(cb.form.type)">
                <label class="block text-xs text-white/50 mb-1">Tiempo límite</label>
                <div class="flex items-center gap-2">
                  <input v-model="cb.form.timeCapMinutes" type="number" min="0" placeholder="15"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">min</span>
                  <input v-model="cb.form.timeCapSeconds" type="number" min="0" max="59" placeholder="00"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">seg</span>
                </div>
              </div>

              <!-- Rounds -->
              <div v-if="showRounds(cb.form.type)">
                <label class="block text-xs text-white/50 mb-1">Rondas</label>
                <input v-model="cb.form.rounds" type="number" min="1" placeholder="Ej. 5"
                  class="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
              </div>

              <!-- Interval (EMOM) -->
              <div v-if="showInterval(cb.form.type)">
                <label class="block text-xs text-white/50 mb-1">Duración del intervalo</label>
                <div class="flex items-center gap-2">
                  <input v-model="cb.form.intervalMinutes" type="number" min="0" placeholder="1"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">min</span>
                  <input v-model="cb.form.intervalSeconds" type="number" min="0" max="59" placeholder="00"
                    class="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-gymOrange" />
                  <span class="text-white/50 text-sm">seg</span>
                </div>
              </div>

              <!-- Rep Scheme -->
              <div v-if="showRepScheme(cb.form.type)">
                <label class="block text-xs text-white/50 mb-1">Esquema de repeticiones</label>
                <input v-model="cb.form.repScheme" type="text" placeholder="Ej. 21-15-9"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
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
                          class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-xs">↑</button>
                        <button type="button" @click="moveExercise(bIndex, eIndex, 1)" :disabled="eIndex === cb.form.exercises.length - 1"
                          class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-xs">↓</button>
                        <button type="button" @click="removeExercise(bIndex, eIndex)" :disabled="cb.form.exercises.length === 1"
                          class="text-red-400/70 hover:text-red-400 disabled:opacity-20 px-1 text-xs">Eliminar</button>
                      </div>
                    </div>

                    <input v-model="ex.name" type="text" placeholder="Nombre del ejercicio"
                      class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />

                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="block text-xs text-white/40 mb-0.5">Reps</label>
                        <input v-model="ex.reps" type="number" min="1" placeholder="—"
                          class="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-gymOrange" />
                      </div>
                      <div>
                        <label class="block text-xs text-white/40 mb-0.5">Tiempo (seg)</label>
                        <input v-model="ex.timeSeconds" type="number" min="1" placeholder="—"
                          class="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-gymOrange" />
                      </div>
                      <div>
                        <label class="block text-xs text-white/40 mb-0.5">Peso</label>
                        <input v-model="ex.weight" type="text" placeholder="Ej. 60kg"
                          class="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
                      </div>
                    </div>

                    <input v-model="ex.notes" type="text" placeholder="Notas (opcional)"
                      class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange" />
                  </div>
                </div>

                <button type="button" @click="addExercise(bIndex)"
                  class="mt-2 w-full border border-dashed border-white/20 rounded-lg py-2 text-white/50 hover:text-white hover:border-white/40 text-xs transition-colors">
                  + Añadir ejercicio
                </button>
              </div>

              <!-- Save to library (only for blocks not already in library) -->
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
                {{ getTypeLabel(block.type) }}
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
