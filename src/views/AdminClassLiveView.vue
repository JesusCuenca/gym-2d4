<script setup>
import { ref, computed, onMounted, onUnmounted, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useSessionStore } from '../stores/sessionStore'
import { useScreenStore } from '../stores/screenStore'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { useTimer } from '../composables/useTimer'
import { formatTimer } from '../utils/time'
import { getBlockLabel, isTimed } from '../models/blockTypes'
import { getTotalDuration } from '../utils/timeline'
import { PlayIcon, PauseIcon, ForwardIcon, StopIcon, CheckIcon } from '@heroicons/vue/24/solid'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/20/solid'

const route = useRoute()
const router = useRouter()
const classStore = useClassStore()
const sessionStore = useSessionStore()
const screenStore = useScreenStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

const sessionRef = toRef(sessionStore, 'session')
const timer = useTimer(sessionRef)

const classData = ref(null)
const sessionId = ref(null)
const selectedScreenId = ref('')
const starting = ref(false)
const started = ref(false)
const expandedBlockIndex = ref(null)
const actionLoading = ref(false)

const currentBlock = computed(() => {
  const s = sessionStore.session
  if (!s) return null
  return s.blocks?.[s.currentBlockIndex]?.blockData
})

const currentBlockIndex = computed(() => sessionStore.session?.currentBlockIndex ?? 0)

const isRunning = computed(() => sessionStore.session?.clockState === 'running')
const isCountdown = computed(() => sessionStore.session?.clockState === 'countdown')
const isCompleted = computed(() => sessionStore.session?.sessionState === 'completed')
const isFinished = computed(() => sessionStore.session?.sessionState === 'finished')

const isLastBlock = computed(() => {
  const s = sessionStore.session
  if (!s) return false
  return s.currentBlockIndex >= (s.blocks?.length || 0) - 1
})

const canAdjustTime = computed(() => {
  const block = currentBlock.value
  const s = sessionStore.session
  if (!block || !s) return false
  return isTimed(block.type) && (s.clockState === 'running' || s.clockState === 'paused')
})

const totalBlockDuration = computed(() => {
  const block = currentBlock.value
  if (!block || !isTimed(block.type)) return null
  return getTotalDuration(block)
})

const timerDisplay = computed(() => {
  const block = currentBlock.value
  if (!block) return '00:00'
  if (isTimed(block.type)) {
    return formatTimer(timer.phaseSecondsLeft.value)
  }
  return formatTimer(timer.displaySeconds.value)
})

const timerLabel = computed(() => {
  const block = currentBlock.value
  if (!block) return ''
  if (isTimed(block.type)) {
    return timer.isResting.value ? 'Descanso' : 'Cuenta atrás'
  }
  return 'Tiempo transcurrido'
})

function formatBlockTime(block) {
  const d = getTotalDuration(block)
  if (!d) return null
  const m = Math.floor(d / 60)
  const s = d % 60
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

function blockMeta(block) {
  const parts = []
  if (block.type === 'timed') {
    const total = formatBlockTime(block)
    if (total) parts.push(`Tiempo: ${total}`)
    if (block.rounds > 1) parts.push(`Rondas: ${block.rounds}`)
    if (block.workSeconds) parts.push(`Trabajo: ${block.workSeconds}s`)
    if (block.restSeconds) parts.push(`Descanso: ${block.restSeconds}s`)
  } else {
    if (block.rounds) parts.push(`Rondas: ${block.rounds}`)
    if (block.repsEveryRound) parts.push(`${block.repsEveryRound} reps`)
    if (block.repsPerRound?.length) parts.push(block.repsPerRound.join('-'))
  }
  return parts
}

function exerciseSummary(ex) {
  const parts = []
  if (ex.repsEveryRound) parts.push(`${ex.repsEveryRound}`)
  parts.push(ex.name)
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
  } catch {
    toastStore.show('Error al iniciar sesión.', 'error')
  } finally {
    starting.value = false
  }
}

async function handlePlay() {
  if (!sessionId.value || actionLoading.value) return
  actionLoading.value = true
  try {
    const s = sessionStore.session
    if (s && s.accumulatedTime === 0 && s.clockState === 'stopped') {
      await sessionStore.startCountdown(sessionId.value)
    } else {
      await sessionStore.play(sessionId.value)
    }
  } catch {
    toastStore.show('Error al iniciar. Intenta de nuevo.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handlePause() {
  if (!sessionId.value || actionLoading.value) return
  actionLoading.value = true
  try {
    await sessionStore.pause(sessionId.value)
  } catch {
    toastStore.show('Error al pausar.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleNextBlock() {
  const s = sessionStore.session
  if (!s || !sessionId.value || actionLoading.value) return
  const nextIndex = s.currentBlockIndex + 1
  if (nextIndex >= s.blocks.length) return
  actionLoading.value = true
  try {
    await sessionStore.nextBlock(sessionId.value, nextIndex)
  } catch {
    toastStore.show('Error al cambiar de bloque.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleAdjustTime(clockDelta) {
  if (!sessionId.value || !canAdjustTime.value || actionLoading.value) return
  const newDisplay = timer.displaySeconds.value - clockDelta
  const maxDuration = totalBlockDuration.value
  if (newDisplay < 0) return
  if (maxDuration && newDisplay >= maxDuration) return
  actionLoading.value = true
  try {
    await sessionStore.adjustTime(sessionId.value, clockDelta)
  } catch {
    toastStore.show('Error al ajustar tiempo.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleGoToBlock(targetIndex) {
  if (actionLoading.value) return
  const s = sessionStore.session
  if (!s || !sessionId.value) return
  if (targetIndex === s.currentBlockIndex) return
  if (targetIndex < 0 || targetIndex >= s.blocks.length) return
  const blockName = s.blocks[targetIndex]?.blockData?.name || `Bloque ${targetIndex + 1}`
  const ok = await confirm({
    title: 'Saltar a bloque',
    message: `¿Saltar a "${blockName}"? Se perderá el progreso del bloque actual.`,
    confirmLabel: 'Saltar',
  })
  if (!ok) return
  actionLoading.value = true
  try {
    await sessionStore.goToBlock(sessionId.value, targetIndex)
  } catch {
    toastStore.show('Error al saltar al bloque.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleComplete() {
  if (!sessionId.value || actionLoading.value) return
  const ok = await confirm({
    title: 'Completar sesión',
    message: '¿Seguro que quieres completar esta sesión? La pantalla de resumen se mostrará en la TV.',
    confirmLabel: 'Completar',
  })
  if (!ok) return
  actionLoading.value = true
  try {
    await sessionStore.completeSession(sessionId.value)
  } catch {
    toastStore.show('Error al completar la sesión.', 'error')
  } finally {
    actionLoading.value = false
  }
}

async function handleEnd() {
  if (!sessionId.value || actionLoading.value) return
  actionLoading.value = true
  try {
    await sessionStore.endSession(sessionId.value, selectedScreenId.value)
    toastStore.show('Sesión finalizada')
  } catch {
    toastStore.show('Error al finalizar.', 'error')
  } finally {
    actionLoading.value = false
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
          <div v-for="(block, i) in classData.blocks" :key="i" class="flex items-center gap-2 text-sm text-white/60">
            <span class="text-white/30">{{ i + 1 }}.</span>
            <span>{{ block.blockData?.name }}</span>
            <span class="text-xs text-white/30">{{ block.blockData ? getBlockLabel(block.blockData) : '' }}</span>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-sm text-white/70 mb-1">Seleccionar pantalla</label>
        <select v-model="selectedScreenId"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gymOrange">
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
        <button @click="handleStart" :disabled="starting || !selectedScreenId"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors">
          {{ starting ? 'Iniciando...' : 'Iniciar sesión' }}
        </button>
        <button @click="handleBack"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white transition-colors">
          Volver
        </button>
      </div>
    </div>

    <!-- Live Remote Control -->
    <div v-else-if="!isCompleted && !isFinished">
      <!-- Session subscription error -->
      <div v-if="sessionStore.error"
        class="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
        {{ sessionStore.error }}
      </div>
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
            {{ getBlockLabel(currentBlock) }}
          </span>
        </div>

        <!-- Block metadata -->
        <div class="flex flex-wrap gap-3 text-sm text-white/50 mb-3">
          <span v-for="(meta, i) in blockMeta(currentBlock)" :key="i">{{ meta }}</span>
        </div>

        <!-- Exercise list -->
        <div v-if="currentBlock.exercises?.length" class="space-y-1">
          <div v-for="(ex, i) in currentBlock.exercises" :key="i"
            class="text-sm text-white/70 flex items-baseline gap-2">
            <span class="text-gymOrange/50">•</span>
            <span>{{ exerciseSummary(ex) }}</span>
            <span v-if="ex.notes" class="text-white/30 text-xs italic">{{ ex.notes }}</span>
          </div>
        </div>
      </div>

      <!-- Timer Display -->
      <div class="text-center mb-6">
        <div class="text-7xl font-black tabular-nums"
          :class="isRunning ? (timer.isResting.value ? 'text-gymRest' : 'text-gymOrange') : 'text-white/70'">
          {{ timerDisplay }}
        </div>
        <p class="text-white/30 text-xs mt-2">{{ timerLabel }}</p>
      </div>

      <!-- Time Adjustment (timed blocks only) -->
      <div v-if="canAdjustTime" class="flex justify-center gap-2 mb-4">
        <button @click="handleAdjustTime(-30)" :disabled="actionLoading"
          class="px-3 py-1.5 text-sm font-bold rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 transition-colors">
          -30s
        </button>
        <button @click="handleAdjustTime(-10)" :disabled="actionLoading"
          class="px-3 py-1.5 text-sm font-bold rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 transition-colors">
          -10s
        </button>
        <button @click="handleAdjustTime(10)" :disabled="actionLoading"
          class="px-3 py-1.5 text-sm font-bold rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 transition-colors">
          +10s
        </button>
        <button @click="handleAdjustTime(30)" :disabled="actionLoading"
          class="px-3 py-1.5 text-sm font-bold rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 transition-colors">
          +30s
        </button>
      </div>

      <!-- Control Buttons -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button v-if="isCountdown" @click="handlePlay" :disabled="actionLoading"
          class="col-span-2 flex items-center justify-center gap-2 bg-gymOrange/50 text-white font-bold rounded-xl px-6 py-5 text-lg hover:bg-gymOrange/70 disabled:opacity-50 transition-colors">
          COMENZANDO...
        </button>
        <button v-else-if="!isRunning" @click="handlePlay" :disabled="actionLoading"
          class="col-span-2 flex items-center justify-center gap-2 bg-green-600 text-white font-bold rounded-xl px-6 py-5 text-lg hover:bg-green-500 disabled:opacity-50 transition-colors">
          <PlayIcon class="w-6 h-6" />
          PLAY
        </button>
        <button v-else @click="handlePause" :disabled="actionLoading"
          class="col-span-2 flex items-center justify-center gap-2 bg-yellow-600 text-white font-bold rounded-xl px-6 py-5 text-lg hover:bg-yellow-500 disabled:opacity-50 transition-colors">
          <PauseIcon class="w-6 h-6" />
          PAUSA
        </button>

        <button @click="handleNextBlock" :disabled="isLastBlock || actionLoading"
          class="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold rounded-xl px-4 py-4 hover:bg-blue-500 disabled:opacity-30 transition-colors">
          SIGUIENTE
          <ForwardIcon class="w-5 h-5" />
        </button>
        <button @click="handleComplete" :disabled="actionLoading"
          class="flex items-center justify-center gap-2 bg-red-600/80 text-white font-bold rounded-xl px-4 py-4 hover:bg-red-600 disabled:opacity-50 transition-colors">
          <StopIcon class="w-5 h-5" />
          FINALIZAR
        </button>
      </div>

      <!-- Block Progress List -->
      <div class="border-t border-white/10 pt-4">
        <h3 class="text-sm font-bold text-white/60 mb-3">Bloques</h3>
        <div class="space-y-1">
          <div v-for="(block, i) in sessionStore.session?.blocks" :key="i">
            <!-- Block row -->
            <div class="flex items-center gap-1">
              <button type="button" @click="toggleBlockExpand(i)"
                class="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                :class="i === currentBlockIndex ? 'bg-gymOrange/10' : 'hover:bg-white/5'">
                <!-- Status icon -->
                <span class="w-5 flex justify-center shrink-0">
                  <CheckIcon v-if="i < currentBlockIndex" class="w-4 h-4 text-green-400" />
                  <PlayIcon v-else-if="i === currentBlockIndex" class="w-4 h-4 text-gymOrange" />
                  <span v-else class="w-2 h-2 rounded-full bg-white/20" />
                </span>
                <!-- Block info -->
                <span class="flex-1 min-w-0">
                  <span class="text-sm font-medium truncate block"
                    :class="i === currentBlockIndex ? 'text-white' : i < currentBlockIndex ? 'text-white/40' : 'text-white/60'">
                    {{ block.blockData?.name || 'Bloque' }}
                  </span>
                </span>
                <span class="text-xs text-white/30 shrink-0">
                  {{ block.blockData ? getBlockLabel(block.blockData) : '' }}
                </span>
                <span class="text-white/20 shrink-0">
                  <ChevronUpIcon v-if="expandedBlockIndex === i" class="w-4 h-4" />
                  <ChevronDownIcon v-else class="w-4 h-4" />
                </span>
              </button>
              <!-- Jump to block button -->
              <button v-if="i !== currentBlockIndex" @click="handleGoToBlock(i)"
                class="shrink-0 p-2 rounded-lg text-white/30 hover:text-gymOrange hover:bg-gymOrange/10 transition-colors"
                title="Saltar a este bloque">
                <ForwardIcon class="w-4 h-4" />
              </button>
            </div>

            <!-- Expanded block details -->
            <div v-if="expandedBlockIndex === i && block.blockData"
              class="ml-8 mr-2 mb-2 bg-white/5 border border-white/10 rounded-lg p-3">
              <div class="flex flex-wrap gap-2 text-xs text-white/40 mb-2">
                <span v-for="(meta, j) in blockMeta(block.blockData)" :key="j">{{ meta }}</span>
              </div>
              <div v-if="block.blockData.exercises?.length" class="space-y-0.5">
                <div v-for="(ex, j) in block.blockData.exercises" :key="j" class="text-xs text-white/50">
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

    <!-- Session Completed (showing on TV) -->
    <div v-else-if="isCompleted" class="text-center py-8">
      <h2 class="text-2xl font-bold text-gymOrange mb-2">Clase completada</h2>
      <p class="text-white/50 text-sm mb-6">{{ classData?.name }}</p>

      <div class="flex justify-center gap-4 mb-8">
        <div class="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center">
          <p class="text-xs text-white/40 uppercase mb-1">Tiempo total</p>
          <p class="text-3xl font-black text-gymOrange tabular-nums">{{
            formatTimer(sessionStore.session?.accumulatedTime || 0) }}</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center">
          <p class="text-xs text-white/40 uppercase mb-1">Bloques</p>
          <p class="text-3xl font-black text-gymOrange tabular-nums">{{ sessionStore.session?.blocks?.length || 0 }}</p>
        </div>
      </div>

      <p class="text-white/30 text-sm mb-6">La pantalla de resumen se está mostrando en la TV.</p>

      <button @click="handleEnd"
        class="bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors">
        Cerrar sesión
      </button>
    </div>

    <!-- Session Finished -->
    <div v-else class="text-center py-12">
      <h2 class="text-3xl font-bold text-gymOrange mb-4">Sesión finalizada</h2>
      <p class="text-white/50 mb-8">{{ classData?.name }}</p>
      <button @click="handleBack"
        class="bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors">
        Volver a clases
      </button>
    </div>
  </div>
</template>
