import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import { doc, updateDoc, setDoc, getDoc, onSnapshot } from 'firebase/firestore'
import { useFirestoreCrud } from '../composables/useFirestoreCrud'
import { useAuthStore } from '../stores/auth'

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const useScreenStore = defineStore('screens', () => {
  const crud = useFirestoreCrud('screens', {
    labels: { item: 'pantalla', items: 'pantallas' },
  })

  async function createScreen(name, customId) {
    const authStore = useAuthStore()
    if (!name?.trim()) {
      crud.error.value = 'El nombre de la pantalla no puede estar vacío.'
      throw new Error(crud.error.value)
    }
    const id = customId?.trim() || slugify(name.trim())
    if (!id) {
      crud.error.value = 'El identificador no puede estar vacío.'
      throw new Error(crud.error.value)
    }
    const existing = await getDoc(doc(db, 'screens', id))
    if (existing.exists()) {
      crud.error.value = `Ya existe una pantalla con el identificador "${id}".`
      throw new Error(crud.error.value)
    }
    crud.error.value = null
    try {
      await setDoc(doc(db, 'screens', id), {
        name: name.trim(),
        activeSessionId: null,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      crud.items.value = [
        { id, name: name.trim(), activeSessionId: null, uid: authStore.user.uid },
        ...crud.items.value,
      ]
      return id
    } catch (e) {
      crud.error.value = 'No se pudo crear la pantalla. Intenta de nuevo.'
      console.error('createScreen error:', e)
      throw e
    }
  }

  async function renameScreen(id, name) {
    if (!name?.trim()) {
      crud.error.value = 'El nombre no puede estar vacío.'
      throw new Error(crud.error.value)
    }
    crud.error.value = null
    try {
      await updateDoc(doc(db, 'screens', id), { name: name.trim() })
      crud.items.value = crud.items.value.map((s) =>
        s.id === id ? { ...s, name: name.trim() } : s,
      )
    } catch (e) {
      crud.error.value = 'No se pudo actualizar el nombre.'
      console.error('renameScreen error:', e)
      throw e
    }
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
    renameScreen,
    deleteScreen: crud.remove,
    setActiveSession,
    clearActiveSession,
    subscribeToScreen,
  }
})
