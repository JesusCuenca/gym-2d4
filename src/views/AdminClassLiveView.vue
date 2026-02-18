<script setup>
import { ref, computed, onMounted, onUnmounted, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useSessionStore } from '../stores/sessionStore'
import { useScreenStore } from '../stores/screenStore'
import { useTimer } from '../composables/useTimer'
import { formatTimer } from '../utils/time'
import { BLOCK_TYPES, isTimeBased } from '../models/blockTypes'

const route = useRoute()
const router = useRouter()
const classStore = useClassStore()
const sessionStore = useSessionStore()
const screenStore = useScreenStore()

const sessionRef = toRef(sessionStore, 'session')
const { displaySeconds } = useTimer(sessionRef)

const classData = ref(null)
const sessionId = ref(null)
const selectedScreenId = ref('')
const starting = ref(false)
const started = ref(false)
const expandedBlockIndex = ref(null)

const currentBlock = computed(() => {
  const s = sessionStore.session
  if (!s) return null
  return s.blocks?.[s.currentBlockIndex]?.blockData
})

const currentBlockIndex = computed(() => sessionStore.session?.currentBlockIndex ?? 0)

const isRunning = computed(() => sessionStore.session?.clockState === 'running')
const isFinished = computed(() => sessionStore.session?.sessionState === 'finished')

const isLastBlock = computed(() => {
  const s = sessionStore.session
  if (!s) return false
  return s.currentBlockIndex >= (s.blocks?.length || 0) - 1
})

const timerDisplay = computed(() => {
  const block = currentBlock.value
  if (!block) return '00:00'
  if (block.family === 'timeBased' && block.timeCapSeconds) {
    const remaining = Math.max(0, block.timeCapSeconds - displaySeconds.value)
    return formatTimer(remaining)
  }
  return formatTimer(displaySeconds.value)
})

function getTypeLabel(type) {
  return BLOCK_TYPES.find((bt) => bt.value === type)?.label ?? type
}

function formatBlockTime(seconds) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

function exerciseSummary(ex) {
  const parts = []
  if (ex.reps) parts.push(`${ex.reps}`)
  if (ex.timeSeconds) parts.push(`${ex.timeSeconds}s`)
  parts.push(ex.name)
  if (ex.weight) parts.push(`(${ex.weight})`)
  return parts.join(' ')
}

function toggleBlockExpand(index) {
  expandedBlockIndex.value = expandedBlockIndex.value === index ? null : index
}

async function handleStart() {
  if (!selectedScreenId.value) return
  starting.value = true
  try {
    sessionId.value = await sessionStore.startSession(classData.value, selectedScreenId.value)
    sessionStore.subscribeToSession(sessionId.value)
    started.value = true
  } finally {
    starting.value = false
  }
}

async function handlePlay() {
  if (sessionId.value) await sessionStore.play(sessionId.value)
}

async function handlePause() {
  if (sessionId.value) await sessionStore.pause(sessionId.value, displaySeconds.value)
}

async function handleNextBlock() {
  const s = sessionStore.session
  if (!s || !sessionId.value) return
  const nextIndex = s.currentBlockIndex + 1
  if (nextIndex < s.blocks.length) {
    await sessionStore.nextBlock(sessionId.value, nextIndex)
  }
}

async function handleEnd() {
  if (!sessionId.value) return
  if (confirm('¿Finalizar esta sesión?')) {
    await sessionStore.endSession(sessionId.value, selectedScreenId.value)
  }
}

function handleBack() {
  sessionStore.unsubscribeFromSession()
  router.push({ name: 'admin-classes' })
}

onMounted(async () => {
  classData.value = await classStore.getClassById(route.params.id)
  await screenStore.fetchScreens()
  if (screenStore.screens.length > 0) {
    selectedScreenId.value = screenStore.screens[0].id
  }
})

onUnmounted(() => {
  sessionStore.unsubscribeFromSession()
})
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Pre-start: Select screen -->
    <div v-if="!started">
      <h1 class="text-2xl font-bold text-gymOrange mb-2">Iniciar sesión en vivo</h1>
      <p class="text-white/50 text-sm mb-6">{{ classData?.name }}</p>

      <div v-if="classData?.blocks?.length" class="mb-6">
        <label class="block text-sm text-white/70 mb-3">Bloques de esta clase:</label>
        <div class="space-y-1">
          <div
            v-for="(block, i) in classData.blocks"
            :key="i"
            class="flex items-center gap-2 text-sm text-white/60"
          >
            <span class="text-white/30">{{ i + 1 }}.</span>
            <span>{{ block.blockData?.name }}</span>
            <span class="text-xs text-white/30">{{ getTypeLabel(block.blockData?.type) }}</span>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-sm text-white/70 mb-1">Seleccionar pantalla</label>
        <select
          v-model="selectedScreenId"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gymOrange"
        >
          <option value="" disabled>Elegir pantalla...</option>
          <option v-for="screen in screenStore.screens" :key="screen.id" :value="screen.id">
            {{ screen.name }}
          </option>
        </select>
        <p v-if="screenStore.screens.length === 0" class="text-red-400/70 text-sm mt-2">
          No hay pantallas disponibles. Añade una en el Panel primero.
        </p>
      </div>

      <div class="flex gap-3">
        <button
          @click="handleStart"
          :disabled="starting || !selectedScreenId"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ starting ? 'Iniciando...' : 'Iniciar sesión' }}
        </button>
        <button
          @click="handleBack"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
        >
          Volver
        </button>
      </div>
    </div>

    <!-- Live Remote Control -->
    <div v-else-if="!isFinished">
      <div class="text-center mb-4">
        <p class="text-white/50 text-sm mb-1">{{ classData?.name }}</p>
        <p class="text-white/40 text-xs">
          Bloque {{ currentBlockIndex + 1 }} de {{ sessionStore.session?.blocks?.length || 0 }}
        </p>
      </div>

      <!-- Current Block Cheat Sheet -->
      <div v-if="currentBlock" class="bg-white/5 border border-gymOrange/30 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold text-white">{{ currentBlock.name }}</h2>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gymOrange/20 text-gymOrange">
            {{ getTypeLabel(currentBlock.type) }}
          </span>
        </div>

        <!-- Block metadata -->
        <div class="flex flex-wrap gap-3 text-sm text-white/50 mb-3">
          <span v-if="currentBlock.timeCapSeconds">
            Tiempo: {{ formatBlockTime(currentBlock.timeCapSeconds) }}
          </span>
          <span v-if="currentBlock.rounds">
            Rondas: {{ currentBlock.rounds }}
          </span>
          <span v-if="currentBlock.intervalSeconds">
            Intervalo: {{ formatBlockTime(currentBlock.intervalSeconds) }}
          </span>
          <span v-if="currentBlock.repScheme">
            {{ currentBlock.repScheme }}
          </span>
        </div>

        <!-- Exercise list -->
        <div v-if="currentBlock.exercises?.length" class="space-y-1">
          <div
            v-for="(ex, i) in currentBlock.exercises"
            :key="i"
            class="text-sm text-white/70 flex items-baseline gap-2"
          >
            <span class="text-gymOrange/50">•</span>
            <span>{{ exerciseSummary(ex) }}</span>
            <span v-if="ex.notes" class="text-white/30 text-xs italic">{{ ex.notes }}</span>
          </div>
        </div>
      </div>

      <!-- Timer Display -->
      <div class="text-center mb-6">
        <div
          class="text-7xl font-black tracking-tight tabular-nums"
          :class="isRunning ? 'text-gymOrange' : 'text-white/70'"
        >
          {{ timerDisplay }}
        </div>
        <p class="text-white/30 text-xs mt-2">
          {{ currentBlock?.family === 'timeBased' ? 'Cuenta atrás' : 'Tiempo transcurrido' }}
        </p>
      </div>

      <!-- Control Buttons -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button
          v-if="!isRunning"
          @click="handlePlay"
          class="col-span-2 bg-green-600 text-white font-bold rounded-xl px-6 py-5 text-lg hover:bg-green-500 transition-colors"
        >
          ▶ PLAY
        </button>
        <button
          v-else
          @click="handlePause"
          class="col-span-2 bg-yellow-600 text-white font-bold rounded-xl px-6 py-5 text-lg hover:bg-yellow-500 transition-colors"
        >
          ⏸ PAUSA
        </button>

        <button
          @click="handleNextBlock"
          :disabled="isLastBlock"
          class="bg-blue-600 text-white font-bold rounded-xl px-4 py-4 hover:bg-blue-500 disabled:opacity-30 transition-colors"
        >
          SIGUIENTE ▶▶
        </button>
        <button
          @click="handleEnd"
          class="bg-red-600/80 text-white font-bold rounded-xl px-4 py-4 hover:bg-red-600 transition-colors"
        >
          FINALIZAR
        </button>
      </div>

      <!-- Block Progress List -->
      <div class="border-t border-white/10 pt-4">
        <h3 class="text-sm font-bold text-white/60 mb-3">Bloques</h3>
        <div class="space-y-1">
          <div
            v-for="(block, i) in sessionStore.session?.blocks"
            :key="i"
          >
            <!-- Block row -->
            <button
              type="button"
              @click="toggleBlockExpand(i)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="i === currentBlockIndex ? 'bg-gymOrange/10' : 'hover:bg-white/5'"
            >
              <!-- Status icon -->
              <span class="w-5 text-center shrink-0">
                <span v-if="i < currentBlockIndex" class="text-green-400 text-sm">✓</span>
                <span v-else-if="i === currentBlockIndex" class="text-gymOrange text-sm">▶</span>
                <span v-else class="text-white/20 text-sm">○</span>
              </span>
              <!-- Block info -->
              <span class="flex-1 min-w-0">
                <span
                  class="text-sm font-medium truncate block"
                  :class="i === currentBlockIndex ? 'text-white' : i < currentBlockIndex ? 'text-white/40' : 'text-white/60'"
                >
                  {{ block.blockData?.name || 'Bloque' }}
                </span>
              </span>
              <span class="text-xs text-white/30 shrink-0">
                {{ getTypeLabel(block.blockData?.type) }}
              </span>
              <span class="text-white/20 text-xs shrink-0">
                {{ expandedBlockIndex === i ? '▲' : '▼' }}
              </span>
            </button>

            <!-- Expanded block details -->
            <div
              v-if="expandedBlockIndex === i && block.blockData"
              class="ml-8 mr-2 mb-2 bg-white/5 border border-white/10 rounded-lg p-3"
            >
              <div class="flex flex-wrap gap-2 text-xs text-white/40 mb-2">
                <span v-if="block.blockData.timeCapSeconds">
                  Tiempo: {{ formatBlockTime(block.blockData.timeCapSeconds) }}
                </span>
                <span v-if="block.blockData.rounds">
                  Rondas: {{ block.blockData.rounds }}
                </span>
                <span v-if="block.blockData.intervalSeconds">
                  Intervalo: {{ formatBlockTime(block.blockData.intervalSeconds) }}
                </span>
                <span v-if="block.blockData.repScheme">
                  {{ block.blockData.repScheme }}
                </span>
              </div>
              <div v-if="block.blockData.exercises?.length" class="space-y-0.5">
                <div
                  v-for="(ex, j) in block.blockData.exercises"
                  :key="j"
                  class="text-xs text-white/50"
                >
                  <span class="text-gymOrange/40">•</span>
                  {{ exerciseSummary(ex) }}
                  <span v-if="ex.notes" class="text-white/25 italic">{{ ex.notes }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TV URL info -->
      <div class="text-center bg-white/5 rounded-lg p-3 mt-4">
        <p class="text-white/30 text-xs mb-1">URL de la TV</p>
        <p class="text-gymOrange text-sm font-mono">/tv/{{ selectedScreenId }}</p>
      </div>
    </div>

    <!-- Session Finished -->
    <div v-else class="text-center py-12">
      <h2 class="text-3xl font-bold text-gymOrange mb-4">Sesión finalizada</h2>
      <p class="text-white/50 mb-8">{{ classData?.name }}</p>
      <button
        @click="handleBack"
        class="bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Volver a clases
      </button>
    </div>
  </div>
</template>
