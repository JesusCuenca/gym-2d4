<script setup>
import { ref, computed, onMounted, onUnmounted, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useSessionStore } from '../stores/sessionStore'
import { useScreenStore } from '../stores/screenStore'
import { useTimer } from '../composables/useTimer'
import { formatTimer } from '../utils/time'
import { BLOCK_TYPES } from '../models/blockTypes'

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

const currentBlock = computed(() => {
  const s = sessionStore.session
  if (!s) return null
  return s.blocks?.[s.currentBlockIndex]?.blockData
})

const blockProgress = computed(() => {
  const s = sessionStore.session
  if (!s) return ''
  return `Block ${s.currentBlockIndex + 1} of ${s.blocks?.length || 0}`
})

const isRunning = computed(() => sessionStore.session?.clockState === 'running')
const isPaused = computed(() => sessionStore.session?.clockState === 'paused')
const isStopped = computed(() => sessionStore.session?.clockState === 'stopped')
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
  if (sessionId.value) {
    await sessionStore.play(sessionId.value)
  }
}

async function handlePause() {
  if (sessionId.value) {
    await sessionStore.pause(sessionId.value, displaySeconds.value)
  }
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
  if (confirm('End this session?')) {
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
      <h1 class="text-2xl font-bold text-gymOrange mb-2">Start Live Session</h1>
      <p class="text-white/50 text-sm mb-6">{{ classData?.name }}</p>

      <div v-if="classData?.blocks?.length" class="mb-6">
        <label class="block text-sm text-white/70 mb-3">Blocks in this class:</label>
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
        <label class="block text-sm text-white/70 mb-1">Select Screen</label>
        <select
          v-model="selectedScreenId"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gymOrange"
        >
          <option value="" disabled>Choose a screen...</option>
          <option v-for="screen in screenStore.screens" :key="screen.id" :value="screen.id">
            {{ screen.name }}
          </option>
        </select>
        <p v-if="screenStore.screens.length === 0" class="text-red-400/70 text-sm mt-2">
          No screens available. Add a screen in the Dashboard first.
        </p>
      </div>

      <div class="flex gap-3">
        <button
          @click="handleStart"
          :disabled="starting || !selectedScreenId"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ starting ? 'Starting...' : 'Start Session' }}
        </button>
        <button
          @click="handleBack"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </div>

    <!-- Live Remote Control -->
    <div v-else-if="!isFinished">
      <div class="text-center mb-6">
        <p class="text-white/50 text-sm mb-1">{{ classData?.name }}</p>
        <p class="text-white/40 text-xs">{{ blockProgress }}</p>
      </div>

      <!-- Current Block Info -->
      <div v-if="currentBlock" class="text-center mb-6">
        <h2 class="text-xl font-bold text-white mb-1">{{ currentBlock.name }}</h2>
        <span class="text-xs px-2 py-1 rounded-full bg-gymOrange/20 text-gymOrange">
          {{ getTypeLabel(currentBlock.type) }}
        </span>
      </div>

      <!-- Timer Display -->
      <div class="text-center mb-8">
        <div
          class="text-7xl font-black tracking-tighter tabular-nums"
          :class="isRunning ? 'text-gymOrange' : 'text-white/70'"
        >
          {{ timerDisplay }}
        </div>
        <p class="text-white/30 text-xs mt-2">
          {{ currentBlock?.family === 'timeBased' ? 'Countdown' : 'Elapsed' }}
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
          ⏸ PAUSE
        </button>

        <button
          @click="handleNextBlock"
          :disabled="isLastBlock"
          class="bg-blue-600 text-white font-bold rounded-xl px-4 py-4 hover:bg-blue-500 disabled:opacity-30 transition-colors"
        >
          NEXT ▶▶
        </button>
        <button
          @click="handleEnd"
          class="bg-red-600/80 text-white font-bold rounded-xl px-4 py-4 hover:bg-red-600 transition-colors"
        >
          END
        </button>
      </div>

      <!-- TV URL info -->
      <div class="text-center bg-white/5 rounded-lg p-3">
        <p class="text-white/30 text-xs mb-1">TV URL</p>
        <p class="text-gymOrange text-sm font-mono">/tv/{{ selectedScreenId }}</p>
      </div>
    </div>

    <!-- Session Finished -->
    <div v-else class="text-center py-12">
      <h2 class="text-3xl font-bold text-gymOrange mb-4">Session Finished</h2>
      <p class="text-white/50 mb-8">{{ classData?.name }}</p>
      <button
        @click="handleBack"
        class="bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Back to Classes
      </button>
    </div>
  </div>
</template>
