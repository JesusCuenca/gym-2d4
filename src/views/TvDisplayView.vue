<script setup>
import { ref, watch, onMounted, onUnmounted, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '../stores/sessionStore'
import { useScreenStore } from '../stores/screenStore'
import { useTimer } from '../composables/useTimer'
import TvWaitingScreen from '../components/tv/TvWaitingScreen.vue'
import TvBlockDisplay from '../components/tv/TvBlockDisplay.vue'

const route = useRoute()
const sessionStore = useSessionStore()
const screenStore = useScreenStore()

const screenData = ref(null)
let unsubscribeScreen = null

const sessionRef = toRef(sessionStore, 'session')
const { displaySeconds } = useTimer(sessionRef)

const hasActiveSession = ref(false)

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
</script>

<template>
  <div class="w-screen h-screen overflow-hidden bg-gymBlack">
    <TvWaitingScreen
      v-if="!sessionStore.session || sessionStore.session.sessionState !== 'active'"
    />
    <TvBlockDisplay
      v-else
      :session="sessionStore.session"
      :displaySeconds="displaySeconds"
    />
  </div>
</template>
