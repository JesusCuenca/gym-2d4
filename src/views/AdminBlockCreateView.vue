<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, isTimeBased } from '../models/blockTypes'

const router = useRouter()
const route = useRoute()
const blockStore = useBlockStore()

const isEditMode = computed(() => !!route.params.id)
const submitting = ref(false)
const validationError = ref('')

const form = ref({
  name: '',
  type: 'amrap',
  timeCapMinutes: '15',
  timeCapSeconds: '00',
  rounds: '',
  intervalMinutes: '1',
  intervalSeconds: '00',
  repScheme: '',
  exercises: [createEmptyExercise()],
})

function createEmptyExercise() {
  return { name: '', reps: '', timeSeconds: '', weight: '', notes: '' }
}

const showTimeCap = computed(() => isTimeBased(form.value.type))
const showInterval = computed(() => form.value.type === 'emom')
const showRepScheme = computed(() => !isTimeBased(form.value.type))
const showRounds = computed(() => ['emom', 'strength', 'tabata'].includes(form.value.type))

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
    const blockData = {
      name: form.value.name,
      type: form.value.type,
      timeCapSeconds: showTimeCap.value
        ? parseInt(form.value.timeCapMinutes || 0) * 60 + parseInt(form.value.timeCapSeconds || 0)
        : null,
      rounds: showRounds.value ? parseInt(form.value.rounds) || null : null,
      intervalSeconds: showInterval.value
        ? parseInt(form.value.intervalMinutes || 0) * 60 + parseInt(form.value.intervalSeconds || 0)
        : null,
      repScheme: showRepScheme.value ? form.value.repScheme || null : null,
      exercises: form.value.exercises.map((ex) => ({
        name: ex.name,
        reps: ex.reps ? parseInt(ex.reps) : null,
        timeSeconds: ex.timeSeconds ? parseInt(ex.timeSeconds) : null,
        weight: ex.weight || null,
        notes: ex.notes || null,
      })),
    }

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
    const block = await blockStore.getBlock(route.params.id)
    if (block) {
      form.value.name = block.name
      form.value.type = block.type
      if (block.timeCapSeconds) {
        form.value.timeCapMinutes = String(Math.floor(block.timeCapSeconds / 60))
        form.value.timeCapSeconds = String(block.timeCapSeconds % 60).padStart(2, '0')
      }
      form.value.rounds = block.rounds ? String(block.rounds) : ''
      if (block.intervalSeconds) {
        form.value.intervalMinutes = String(Math.floor(block.intervalSeconds / 60))
        form.value.intervalSeconds = String(block.intervalSeconds % 60).padStart(2, '0')
      }
      form.value.repScheme = block.repScheme || ''
      form.value.exercises = block.exercises.length
        ? block.exercises.map((ex) => ({
            name: ex.name || '',
            reps: ex.reps ? String(ex.reps) : '',
            timeSeconds: ex.timeSeconds ? String(ex.timeSeconds) : '',
            weight: ex.weight || '',
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

    <form @submit.prevent="handleSubmit" class="space-y-6">
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
        <select
          v-model="form.type"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gymOrange"
        >
          <option v-for="bt in BLOCK_TYPES" :key="bt.value" :value="bt.value">
            {{ bt.label }}
          </option>
        </select>
      </div>

      <!-- Time Cap (Family A) -->
      <div v-if="showTimeCap">
        <label class="block text-sm text-white/70 mb-1">Tiempo límite</label>
        <div class="flex items-center gap-2">
          <input
            v-model="form.timeCapMinutes"
            type="number"
            min="0"
            placeholder="15"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">min</span>
          <input
            v-model="form.timeCapSeconds"
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

      <!-- Interval (EMOM) -->
      <div v-if="showInterval">
        <label class="block text-sm text-white/70 mb-1">Duración del intervalo</label>
        <div class="flex items-center gap-2">
          <input
            v-model="form.intervalMinutes"
            type="number"
            min="0"
            placeholder="1"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">min</span>
          <input
            v-model="form.intervalSeconds"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            class="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white text-center focus:outline-none focus:border-gymOrange"
          />
          <span class="text-white/50">seg</span>
        </div>
      </div>

      <!-- Rep Scheme (Family B) -->
      <div v-if="showRepScheme">
        <label class="block text-sm text-white/70 mb-1">Esquema de repeticiones</label>
        <input
          v-model="form.repScheme"
          type="text"
          placeholder="Ej. 21-15-9"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
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
                  class="text-white/30 hover:text-white disabled:opacity-20 px-2 py-1 text-sm"
                >↑</button>
                <button
                  type="button"
                  @click="moveExercise(index, 1)"
                  :disabled="index === form.exercises.length - 1"
                  class="text-white/30 hover:text-white disabled:opacity-20 px-2 py-1 text-sm"
                >↓</button>
                <button
                  type="button"
                  @click="removeExercise(index)"
                  :disabled="form.exercises.length === 1"
                  class="text-red-400/70 hover:text-red-400 disabled:opacity-20 px-2 py-1 text-sm"
                >Eliminar</button>
              </div>
            </div>

            <input
              v-model="exercise.name"
              type="text"
              required
              placeholder="Nombre del ejercicio"
              class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
            />

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-xs text-white/50 mb-1">Reps</label>
                <input
                  v-model="exercise.reps"
                  type="number"
                  min="1"
                  placeholder="—"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-gymOrange"
                />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Tiempo (seg)</label>
                <input
                  v-model="exercise.timeSeconds"
                  type="number"
                  min="1"
                  placeholder="—"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-gymOrange"
                />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Peso</label>
                <input
                  v-model="exercise.weight"
                  type="text"
                  placeholder="Ej. 60kg"
                  class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
                />
              </div>
            </div>

            <input
              v-model="exercise.notes"
              type="text"
              placeholder="Notas (opcional)"
              class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
            />
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
