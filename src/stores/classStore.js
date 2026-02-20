import { ref } from 'vue'
import { defineStore } from 'pinia'
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
import { useAuthStore } from './auth'
import { validateClass } from '../utils/validation'

export const useClassStore = defineStore('classes', () => {
  const classes = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchClasses() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'classes'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      classes.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar las clases. Intenta de nuevo.'
      console.error('fetchClasses error:', e)
    } finally {
      loading.value = false
    }
  }

  async function getClassById(classId) {
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, 'classes', classId))
      if (!snapshot.exists()) return null
      return { id: snapshot.id, ...snapshot.data() }
    } catch (e) {
      error.value = 'No se pudo cargar la clase.'
      console.error('getClassById error:', e)
      return null
    }
  }

  async function createClass(classData) {
    const validation = validateClass(classData)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }

    error.value = null
    try {
      const authStore = useAuthStore()
      const docRef = await addDoc(collection(db, 'classes'), {
        ...classData,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      await fetchClasses()
      return docRef.id
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo crear la clase. Intenta de nuevo.'
      }
      console.error('createClass error:', e)
      throw e
    }
  }

  async function updateClass(classId, classData) {
    const validation = validateClass(classData)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }

    error.value = null
    try {
      await updateDoc(doc(db, 'classes', classId), classData)
      await fetchClasses()
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo actualizar la clase. Intenta de nuevo.'
      }
      console.error('updateClass error:', e)
      throw e
    }
  }

  async function fetchAllClasses() {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'classes'),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      classes.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar las clases. Intenta de nuevo.'
      console.error('fetchAllClasses error:', e)
    } finally {
      loading.value = false
    }
  }

  async function deleteClass(classId) {
    error.value = null
    try {
      await deleteDoc(doc(db, 'classes', classId))
      classes.value = classes.value.filter((c) => c.id !== classId)
    } catch (e) {
      error.value = 'No se pudo eliminar la clase. Intenta de nuevo.'
      console.error('deleteClass error:', e)
      throw e
    }
  }

  return { classes, loading, error, fetchClasses, fetchAllClasses, getClassById, createClass, updateClass, deleteClass }
})
