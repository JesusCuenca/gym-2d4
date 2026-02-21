<script setup>
import { ref, computed, watch, onMounted, onUnmounted, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { doc, updateDoc } from 'firebase/firestore'
import { db, serverTimestamp } from '../firebase'
import { useSessionStore } from '../stores/sessionStore'
import { useScreenStore } from '../stores/screenStore'
import { useTimer } from '../composables/useTimer'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import { useAudioCues } from '../composables/useAudioCues'
import TvWaitingScreen from '../components/tv/TvWaitingScreen.vue'
import TvBlockDisplay from '../components/tv/TvBlockDisplay.vue'
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/vue/24/solid'

const route = useRoute()
const sessionStore = useSessionStore()
const screenStore = useScreenStore()

const screenData = ref(null)
let unsubscribeScreen = null

const sessionRef = toRef(sessionStore, 'session')
const timer = useTimer(sessionRef)
const { audioEnabled, toggleAudio, playWorkStart, playRestStart, playCountdown, playFinished } = useAudioCues()

const hasActiveSession = ref(false)
const { isOnline } = useConnectionStatus()
const subscriptionError = computed(() => screenStore.error || sessionStore.error)

function onScreenUpdate(data) {
  screenData.value = data

  if (data?.activeSessionId) {
    // If session changed, resubscribe
    if (!hasActiveSession.value || sessionStore.session?.id !== data.activeSessionId) {
      sessionStore.subscribeToSession(data.activeSessionId)
      hasActiveSession.value = true
    }
  } else {
    // No active session
    sessionStore.unsubscribeFromSession()
    hasActiveSession.value = false
  }
}

onMounted(() => {
  const screenId = route.params.id
  unsubscribeScreen = screenStore.subscribeToScreen(screenId, onScreenUpdate)
})

onUnmounted(() => {
  if (unsubscribeScreen) {
    unsubscribeScreen()
  }
  sessionStore.unsubscribeFromSession()
})

// --- Audio cue watchers ---

// Work ↔ Rest transitions
watch(
  () => timer.isResting,
  (isRest, wasRest) => {
    if (sessionRef.value?.clockState !== 'running') return
    if (wasRest === undefined) return
    if (isRest) {
      playRestStart()
    } else {
      playWorkStart()
    }
  },
)

// Countdown 3-2-1 beeps
watch(
  () => timer.countdownSecondsLeft,
  (n, prev) => {
    if (n != null && n !== prev && n >= 1 && n <= 3) {
      playCountdown(n)
    }
  },
)

// Phase ending countdown (last 3 seconds of work/rest phases)
watch(
  () => Math.ceil(timer.phaseSecondsLeft),
  (secs, prev) => {
    if (sessionRef.value?.clockState !== 'running') return
    if (secs === prev) return
    if (secs >= 1 && secs <= 3) {
      playCountdown(secs)
    }
  },
)

// Countdown → Running transition (block start)
watch(
  () => sessionRef.value?.clockState,
  (state, prevState) => {
    if (prevState === 'countdown' && state === 'running') {
      playWorkStart()
    }
  },
)

// Session finished
watch(
  () => sessionRef.value?.sessionState,
  (state, prevState) => {
    if (prevState === 'active' && state === 'completed') {
      playFinished()
    }
  },
)

// Self-heal: if countdown stays stuck >5s, force transition to running
watch(
  () => timer.isCountdownStuck,
  async (stuck) => {
    if (!stuck) return
    const s = sessionRef.value
    if (!s || s.clockState !== 'countdown') return
    console.warn('Stuck countdown detected, self-healing to running')
    try {
      await updateDoc(doc(db, 'sessions', s.id), {
        clockState: 'running',
        startTimestamp: serverTimestamp(),
      })
    } catch (e) {
      console.error('Self-heal failed:', e)
    }
  },
)
</script>

<template>
  <div class="w-screen h-screen overflow-hidden bg-gymBlack relative">
    <!-- Audio toggle -->
    <button
      @click="toggleAudio"
      class="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
    >
      <SpeakerWaveIcon v-if="audioEnabled" class="w-6 h-6 text-white" />
      <SpeakerXMarkIcon v-else class="w-6 h-6 text-white/60" />
    </button>

    <!-- Offline indicator -->
    <div
      v-if="!isOnline"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white text-xl font-bold font-condensed uppercase tracking-wider rounded-full px-8 py-3 animate-pulse"
    >
      Reconectando...
    </div>

    <!-- Subscription error overlay -->
    <div
      v-if="subscriptionError && !sessionStore.session"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gymBlack/95"
    >
      <p class="text-5xl font-black font-condensed uppercase text-red-500 mb-4">
        Error de conexión
      </p>
      <p class="text-2xl text-white/70 font-condensed">{{ subscriptionError }}</p>
      <p class="text-xl text-white/60 font-condensed mt-6 animate-pulse">Reconectando...</p>
    </div>

    <TvWaitingScreen
      v-if="!sessionStore.session || !['active', 'completed'].includes(sessionStore.session.sessionState)"
      :screenName="screenData?.name"
    />
    <TvBlockDisplay
      v-else
      :session="sessionStore.session"
      :timer="timer"
    />
  </div>
</template>
