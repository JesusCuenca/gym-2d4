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
  const error = ref(null)

  async function fetchScreens() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'screens'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      screens.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar las pantallas. Intenta de nuevo.'
      console.error('fetchScreens error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createScreen(name) {
    if (!name?.trim()) {
      error.value = 'El nombre de la pantalla no puede estar vacío.'
      throw new Error(error.value)
    }

    error.value = null
    try {
      const authStore = useAuthStore()
      const docRef = await addDoc(collection(db, 'screens'), {
        name,
        activeSessionId: null,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      await fetchScreens()
      return docRef.id
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo crear la pantalla. Intenta de nuevo.'
      }
      console.error('createScreen error:', e)
      throw e
    }
  }

  async function deleteScreen(screenId) {
    error.value = null
    try {
      await deleteDoc(doc(db, 'screens', screenId))
      screens.value = screens.value.filter((s) => s.id !== screenId)
    } catch (e) {
      error.value = 'No se pudo eliminar la pantalla. Intenta de nuevo.'
      console.error('deleteScreen error:', e)
      throw e
    }
  }

  async function setActiveSession(screenId, sessionId) {
    error.value = null
    try {
      await updateDoc(doc(db, 'screens', screenId), {
        activeSessionId: sessionId,
      })
    } catch (e) {
      error.value = 'No se pudo vincular la sesión a la pantalla.'
      console.error('setActiveSession error:', e)
      throw e
    }
  }

  async function clearActiveSession(screenId) {
    error.value = null
    try {
      await updateDoc(doc(db, 'screens', screenId), {
        activeSessionId: null,
      })
    } catch (e) {
      error.value = 'No se pudo desvincular la sesión de la pantalla.'
      console.error('clearActiveSession error:', e)
      throw e
    }
  }

  // Real-time subscription for TV display
  function subscribeToScreen(screenId, callback) {
    return onSnapshot(
      doc(db, 'screens', screenId),
      (snapshot) => {
        const data = snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
        callback(data)
      },
      (e) => {
        console.error('subscribeToScreen error:', e)
        error.value = 'Se perdió la conexión con la pantalla.'
        callback(null)
      },
    )
  }

  return {
    screens,
    loading,
    error,
    fetchScreens,
    createScreen,
    deleteScreen,
    setActiveSession,
    clearActiveSession,
    subscribeToScreen,
  }
})
