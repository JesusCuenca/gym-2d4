import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import { timestampToMillis } from '../utils/firestore'
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
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

      const batch = writeBatch(db)
      const sessionRef = doc(collection(db, 'sessions'))

      batch.set(sessionRef, {
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

      batch.update(doc(db, 'screens', screenId), { activeSessionId: sessionRef.id })

      await batch.commit()

      return sessionRef.id
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

  async function pause(sessionId) {
    clearCountdownTimeout()
    error.value = null
    try {
      const s = session.value
      if (!s || !s.startTimestamp) return

      // Compute elapsed directly from session data instead of relying on
      // rAF-updated displaySeconds, which can be stale if the screen was off.
      const elapsed = s.accumulatedTime + (Date.now() - timestampToMillis(s.startTimestamp)) / 1000

      await updateDoc(doc(db, 'sessions', sessionId), {
        clockState: 'paused',
        startTimestamp: null,
        accumulatedTime: elapsed,
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

  async function adjustTime(sessionId, clockDelta) {
    error.value = null
    try {
      const s = session.value
      if (!s) return
      // clockDelta > 0 = "add time to clock" (more remaining) → decrease accumulatedTime
      // clockDelta < 0 = "remove time" (less remaining) → increase accumulatedTime
      const newAccumulated = Math.max(0, s.accumulatedTime - clockDelta)
      await updateDoc(doc(db, 'sessions', sessionId), {
        accumulatedTime: newAccumulated,
      })
    } catch (e) {
      error.value = 'Error al ajustar el tiempo.'
      console.error('adjustTime error:', e)
      throw e
    }
  }

  async function goToBlock(sessionId, targetIndex) {
    clearCountdownTimeout()
    error.value = null
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        currentBlockIndex: targetIndex,
        clockState: 'stopped',
        startTimestamp: null,
        accumulatedTime: 0,
        currentRound: null,
      })
    } catch (e) {
      error.value = 'Error al saltar al bloque.'
      console.error('goToBlock error:', e)
      throw e
    }
  }

  async function completeSession(sessionId) {
    clearCountdownTimeout()
    error.value = null
    try {
      const s = session.value
      const updateData = {
        sessionState: 'completed',
        clockState: 'finished',
        startTimestamp: null,
      }

      // Compute elapsed directly from session data (same fix as pause)
      if (s?.startTimestamp) {
        updateData.accumulatedTime = s.accumulatedTime + (Date.now() - timestampToMillis(s.startTimestamp)) / 1000
      }

      await updateDoc(doc(db, 'sessions', sessionId), updateData)
    } catch (e) {
      error.value = 'Error al completar la sesión.'
      console.error('completeSession error:', e)
      throw e
    }
  }

  async function endSession(sessionId, screenId) {
    clearCountdownTimeout()
    error.value = null
    try {
      const batch = writeBatch(db)

      batch.update(doc(db, 'sessions', sessionId), { sessionState: 'finished' })

      if (screenId) {
        batch.update(doc(db, 'screens', screenId), { activeSessionId: null })
      }

      await batch.commit()
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
    clearCountdownTimeout()
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
    adjustTime,
    goToBlock,
    completeSession,
    endSession,
    subscribeToSession,
    unsubscribeFromSession,
  }
})
