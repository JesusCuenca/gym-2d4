import { ref } from 'vue'
import { db, serverTimestamp } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { useAuthStore } from '../stores/auth'

/**
 * Generic Firestore CRUD composable.
 *
 * Error handling convention:
 * - Reads (fetchOwn, fetchAll, getById): set error.value, do NOT throw.
 * - Writes (create, update, remove): set error.value AND throw.
 *
 * Writes are optimistic: local array is updated immediately without re-fetching.
 */
export function useFirestoreCrud(collectionName, { validateFn, labels = {} } = {}) {
  const { item: labelItem = 'elemento', items: labelItems = 'elementos' } = labels

  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  function $reset() {
    items.value = []
    loading.value = false
    error.value = null
  }

  async function fetchOwn() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, collectionName),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      items.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = `No se pudieron cargar los ${labelItems}. Intenta de nuevo.`
      console.error(`fetchOwn(${collectionName}) error:`, e)
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      items.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = `No se pudieron cargar los ${labelItems}. Intenta de nuevo.`
      console.error(`fetchAll(${collectionName}) error:`, e)
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, collectionName, id))
      if (!snapshot.exists()) return null
      return { id: snapshot.id, ...snapshot.data() }
    } catch (e) {
      error.value = `No se pudo cargar el ${labelItem}.`
      console.error(`getById(${collectionName}) error:`, e)
      return null
    }
  }

  async function create(data) {
    if (validateFn) {
      const validation = validateFn(data)
      if (!validation.valid) {
        error.value = validation.message
        throw new Error(validation.message)
      }
    }
    error.value = null
    const authStore = useAuthStore()
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      // Optimistic: prepend to local array (no re-fetch)
      items.value = [{ id: docRef.id, ...data, uid: authStore.user.uid }, ...items.value]
      return docRef.id
    } catch (e) {
      error.value = `No se pudo crear el ${labelItem}. Intenta de nuevo.`
      console.error(`create(${collectionName}) error:`, e)
      throw e
    }
  }

  async function update(id, data) {
    if (validateFn) {
      const validation = validateFn(data)
      if (!validation.valid) {
        error.value = validation.message
        throw new Error(validation.message)
      }
    }
    error.value = null
    try {
      await updateDoc(doc(db, collectionName, id), data)
      // Optimistic: update item in local array (no re-fetch)
      items.value = items.value.map((item) => (item.id === id ? { ...item, ...data } : item))
    } catch (e) {
      error.value = `No se pudo actualizar el ${labelItem}. Intenta de nuevo.`
      console.error(`update(${collectionName}) error:`, e)
      throw e
    }
  }

  async function remove(id) {
    error.value = null
    try {
      await deleteDoc(doc(db, collectionName, id))
      // Optimistic: filter from local array
      items.value = items.value.filter((item) => item.id !== id)
    } catch (e) {
      error.value = `No se pudo eliminar el ${labelItem}. Intenta de nuevo.`
      console.error(`remove(${collectionName}) error:`, e)
      throw e
    }
  }

  return { items, loading, error, $reset, fetchOwn, fetchAll, getById, create, update, remove }
}
