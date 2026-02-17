import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useScreenStore = defineStore('screens', () => {
  const screens = ref([])
  const loading = ref(false)

  async function fetchScreens() {
    const authStore = useAuthStore()
    loading.value = true
    try {
      const q = query(
        collection(db, 'screens'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      screens.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function createScreen(name) {
    const authStore = useAuthStore()
    const docRef = await addDoc(collection(db, 'screens'), {
      name,
      activeSessionId: null,
      uid: authStore.user.uid,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }

  async function deleteScreen(screenId) {
    await deleteDoc(doc(db, 'screens', screenId))
    screens.value = screens.value.filter((s) => s.id !== screenId)
  }

  async function setActiveSession(screenId, sessionId) {
    await updateDoc(doc(db, 'screens', screenId), {
      activeSessionId: sessionId,
    })
  }

  async function clearActiveSession(screenId) {
    await updateDoc(doc(db, 'screens', screenId), {
      activeSessionId: null,
    })
  }

  // Real-time subscription for TV display
  function subscribeToScreen(screenId, callback) {
    return onSnapshot(doc(db, 'screens', screenId), (snapshot) => {
      const data = snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null
      callback(data)
    })
  }

  return {
    screens,
    loading,
    fetchScreens,
    createScreen,
    deleteScreen,
    setActiveSession,
    clearActiveSession,
    subscribeToScreen,
  }
})
