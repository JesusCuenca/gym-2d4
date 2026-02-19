import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useScreenStore } from './screenStore'
import { validateSessionInputs } from '../utils/validation'

let countdownTimeoutId = null

function clearCountdownTimeout() {
  if (countdownTimeoutId) {
    clearTimeout(countdownTimeoutId)
    countdownTimeoutId = null
  }
}

export const useSessionStore = defineStore('session', () => {
  const session = ref(null)
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  async function startSession(classData, screenId) {
    const validation = validateSessionInputs(classData, screenId)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }

    error.value = null
    try {
      const authStore = useAuthStore()
      const screenStore = useScreenStore()

      const docRef = await addDoc(collection(db, 'sessions'), {
        classId: classData.id,
        className: classData.name,
        blocks: classData.blocks,
        currentBlockIndex: 0,
        clockState: 'stopped',
        startTimestamp: null,
        accumulatedTime: 0,
        currentRound: null,
        sessionState: 'active',
        screenId,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })

      const sessionId = docRef.id

      // Link session to screen
      await screenStore.setActiveSession(screenId, sessionId)

      return sessionId
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo iniciar la sesión. Intenta de nuevo.'
      }
      console.error('startSession error:', e)
      throw e
    }
  }

  async function startCountdown(sessionId) {
    clearCountdownTimeout()
    error.value = null
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        clockState: 'countdown',
        startTimestamp: serverTimestamp(),
        accumulatedTime: 0,
      })
      countdownTimeoutId = setTimeout(async () => {
        countdownTimeoutId = null
        try {
          await updateDoc(doc(db, 'sessions', sessionId), {
            clockState: 'running',
            startTimestamp: serverTimestamp(),
          })
        } catch (e) {
          console.error('countdown→running transition error:', e)
        }
      }, 3000)
    } catch (e) {
      error.value = 'Error al iniciar la cuenta regresiva.'
      console.error('startCountdown error:', e)
      throw e
    }
  }

  async function play(sessionId) {
    clearCountdownTimeout()
    error.value = null
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        clockState: 'running',
        startTimestamp: serverTimestamp(),
      })
    } catch (e) {
      error.value = 'Error al iniciar el temporizador.'
      console.error('play error:', e)
      throw e
    }
  }

  async function pause(sessionId, elapsedSeconds) {
    clearCountdownTimeout()
    error.value = null
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        clockState: 'paused',
        startTimestamp: null,
        accumulatedTime: elapsedSeconds,
      })
    } catch (e) {
      error.value = 'Error al pausar el temporizador.'
      console.error('pause error:', e)
      throw e
    }
  }

  async function nextBlock(sessionId, nextIndex) {
    clearCountdownTimeout()
    error.value = null
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        currentBlockIndex: nextIndex,
        clockState: 'stopped',
        startTimestamp: null,
        accumulatedTime: 0,
        currentRound: null,
      })
    } catch (e) {
      error.value = 'Error al avanzar al siguiente bloque.'
      console.error('nextBlock error:', e)
      throw e
    }
  }

  async function completeSession(sessionId, finalElapsed) {
    clearCountdownTimeout()
    error.value = null
    try {
      const updateData = {
        sessionState: 'completed',
        clockState: 'finished',
        startTimestamp: null,
      }
      if (finalElapsed != null) {
        updateData.accumulatedTime = finalElapsed
      }
      await updateDoc(doc(db, 'sessions', sessionId), updateData)
    } catch (e) {
      error.value = 'Error al completar la sesión.'
      console.error('completeSession error:', e)
      throw e
    }
  }

  async function endSession(sessionId, screenId) {
    error.value = null
    try {
      const screenStore = useScreenStore()

      await updateDoc(doc(db, 'sessions', sessionId), {
        sessionState: 'finished',
      })

      // Unlink session from screen
      if (screenId) {
        await screenStore.clearActiveSession(screenId)
      }
    } catch (e) {
      error.value = 'Error al finalizar la sesión.'
      console.error('endSession error:', e)
      throw e
    }
  }

  function subscribeToSession(sessionId) {
    unsubscribeFromSession()
    loading.value = true
    error.value = null
    unsubscribe = onSnapshot(
      doc(db, 'sessions', sessionId),
      (snapshot) => {
        session.value = snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
        loading.value = false
      },
      (e) => {
        error.value = 'Se perdió la conexión con la sesión.'
        console.error('subscribeToSession error:', e)
        loading.value = false
      },
    )
  }

  function unsubscribeFromSession() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    session.value = null
  }

  return {
    session,
    loading,
    error,
    startSession,
    startCountdown,
    play,
    pause,
    nextBlock,
    completeSession,
    endSession,
    subscribeToSession,
    unsubscribeFromSession,
  }
})
