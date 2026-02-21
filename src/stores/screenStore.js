import { defineStore } from 'pinia'
import { db } from '../firebase'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { useFirestoreCrud } from '../composables/useFirestoreCrud'

export const useScreenStore = defineStore('screens', () => {
  const crud = useFirestoreCrud('screens', {
    labels: { item: 'pantalla', items: 'pantallas' },
  })

  async function createScreen(name) {
    if (!name?.trim()) {
      crud.error.value = 'El nombre de la pantalla no puede estar vacío.'
      throw new Error(crud.error.value)
    }
    return crud.create({ name: name.trim(), activeSessionId: null })
  }

  async function setActiveSession(screenId, sessionId) {
    crud.error.value = null
    try {
      await updateDoc(doc(db, 'screens', screenId), { activeSessionId: sessionId })
    } catch (e) {
      crud.error.value = 'No se pudo vincular la sesión a la pantalla.'
      console.error('setActiveSession error:', e)
      throw e
    }
  }

  async function clearActiveSession(screenId) {
    crud.error.value = null
    try {
      await updateDoc(doc(db, 'screens', screenId), { activeSessionId: null })
    } catch (e) {
      crud.error.value = 'No se pudo desvincular la sesión de la pantalla.'
      console.error('clearActiveSession error:', e)
      throw e
    }
  }

  // Real-time subscription for TV display
  function subscribeToScreen(screenId, callback) {
    return onSnapshot(
      doc(db, 'screens', screenId),
      (snapshot) => {
        const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
        callback(data)
      },
      (e) => {
        console.error('subscribeToScreen error:', e)
        crud.error.value = 'Se perdió la conexión con la pantalla.'
        callback(null)
      },
    )
  }

  return {
    screens: crud.items,
    loading: crud.loading,
    error: crud.error,
    $reset: crud.$reset,
    fetchScreens: crud.fetchOwn,
    createScreen,
    deleteScreen: crud.remove,
    setActiveSession,
    clearActiveSession,
    subscribeToScreen,
  }
})
