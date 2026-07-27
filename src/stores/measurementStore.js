import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { validateMeasurement } from '../utils/validation'

/**
 * Measurements live in the clients/{clientId}/measurements subcollection,
 * so useFirestoreCrud (top-level collections, fetch-by-uid) doesn't fit.
 * Same error convention: reads set error without throwing, writes set
 * error AND throw. `measurements` is kept sorted by measuredAt ascending.
 */
export const useMeasurementStore = defineStore('measurements', () => {
  const measurements = ref([])
  const loading = ref(false)
  const error = ref(null)

  function $reset() {
    measurements.value = []
    loading.value = false
    error.value = null
  }

  function measurementsRef(clientId) {
    return collection(db, 'clients', clientId, 'measurements')
  }

  function sortByMeasuredAt(items) {
    return [...items].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  }

  // Works without auth (public progress page). Single-field orderBy:
  // no composite index needed.
  async function fetchMeasurements(clientId) {
    loading.value = true
    error.value = null
    try {
      const q = query(measurementsRef(clientId), orderBy('measuredAt', 'asc'))
      const snapshot = await getDocs(q)
      measurements.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar las mediciones. Intenta de nuevo.'
      console.error('fetchMeasurements error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createMeasurement(clientId, data) {
    const validation = validateMeasurement(data)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }
    error.value = null
    const authStore = useAuthStore()
    try {
      const docRef = await addDoc(measurementsRef(clientId), {
        ...data,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      measurements.value = sortByMeasuredAt([
        ...measurements.value,
        { id: docRef.id, ...data, uid: authStore.user.uid },
      ])
      return docRef.id
    } catch (e) {
      error.value = 'No se pudo crear la medición. Intenta de nuevo.'
      console.error('createMeasurement error:', e)
      throw e
    }
  }

  async function updateMeasurement(clientId, measurementId, data) {
    const validation = validateMeasurement(data)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }
    error.value = null
    try {
      await updateDoc(doc(db, 'clients', clientId, 'measurements', measurementId), data)
      measurements.value = sortByMeasuredAt(
        measurements.value.map((m) => (m.id === measurementId ? { ...m, ...data } : m)),
      )
    } catch (e) {
      error.value = 'No se pudo actualizar la medición. Intenta de nuevo.'
      console.error('updateMeasurement error:', e)
      throw e
    }
  }

  async function deleteMeasurement(clientId, measurementId) {
    error.value = null
    try {
      await deleteDoc(doc(db, 'clients', clientId, 'measurements', measurementId))
      measurements.value = measurements.value.filter((m) => m.id !== measurementId)
    } catch (e) {
      error.value = 'No se pudo eliminar la medición. Intenta de nuevo.'
      console.error('deleteMeasurement error:', e)
      throw e
    }
  }

  return {
    measurements,
    loading,
    error,
    $reset,
    fetchMeasurements,
    createMeasurement,
    updateMeasurement,
    deleteMeasurement,
  }
})
