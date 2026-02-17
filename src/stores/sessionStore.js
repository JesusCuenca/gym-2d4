import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useScreenStore } from './screenStore'

export const useSessionStore = defineStore('session', () => {
  const session = ref(null)
  const loading = ref(false)
  let unsubscribe = null

  async function startSession(classData, screenId) {
    const authStore = useAuthStore()
    const screenStore = useScreenStore()
    const sessionId = `${classData.id}_${Date.now()}`

    await setDoc(doc(db, 'sessions', sessionId), {
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

    // Link session to screen
    await screenStore.setActiveSession(screenId, sessionId)

    return sessionId
  }

  async function play(sessionId) {
    await updateDoc(doc(db, 'sessions', sessionId), {
      clockState: 'running',
      startTimestamp: serverTimestamp(),
    })
  }

  async function pause(sessionId, elapsedSeconds) {
    await updateDoc(doc(db, 'sessions', sessionId), {
      clockState: 'paused',
      startTimestamp: null,
      accumulatedTime: elapsedSeconds,
    })
  }

  async function nextBlock(sessionId, nextIndex) {
    await updateDoc(doc(db, 'sessions', sessionId), {
      currentBlockIndex: nextIndex,
      clockState: 'stopped',
      startTimestamp: null,
      accumulatedTime: 0,
      currentRound: null,
    })
  }

  async function endSession(sessionId, screenId) {
    const screenStore = useScreenStore()

    await updateDoc(doc(db, 'sessions', sessionId), {
      sessionState: 'finished',
      clockState: 'finished',
      startTimestamp: null,
    })

    // Unlink session from screen
    if (screenId) {
      await screenStore.clearActiveSession(screenId)
    }
  }

  function subscribeToSession(sessionId) {
    unsubscribeFromSession()
    loading.value = true
    unsubscribe = onSnapshot(doc(db, 'sessions', sessionId), (snapshot) => {
      session.value = snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null
      loading.value = false
    })
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
    startSession,
    play,
    pause,
    nextBlock,
    endSession,
    subscribeToSession,
    unsubscribeFromSession,
  }
})
