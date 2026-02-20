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
import { validateBlock } from '../utils/validation'

export const useBlockStore = defineStore('blocks', () => {
  const blocks = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchBlocks() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'blocks'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      blocks.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar los bloques. Intenta de nuevo.'
      console.error('fetchBlocks error:', e)
    } finally {
      loading.value = false
    }
  }

  async function getBlock(blockId) {
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, 'blocks', blockId))
      if (!snapshot.exists()) return null
      return { id: snapshot.id, ...snapshot.data() }
    } catch (e) {
      error.value = 'No se pudo cargar el bloque.'
      console.error('getBlock error:', e)
      return null
    }
  }

  async function createBlock(blockData) {
    const validation = validateBlock(blockData)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }

    error.value = null
    try {
      const authStore = useAuthStore()
      const docRef = await addDoc(collection(db, 'blocks'), {
        ...blockData,
        uid: authStore.user.uid,
        createdAt: serverTimestamp(),
      })
      await fetchBlocks()
      return docRef.id
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo crear el bloque. Intenta de nuevo.'
      }
      console.error('createBlock error:', e)
      throw e
    }
  }

  async function updateBlock(blockId, blockData) {
    const validation = validateBlock(blockData)
    if (!validation.valid) {
      error.value = validation.message
      throw new Error(validation.message)
    }

    error.value = null
    try {
      await updateDoc(doc(db, 'blocks', blockId), { ...blockData })
      await fetchBlocks()
    } catch (e) {
      if (!error.value) {
        error.value = 'No se pudo actualizar el bloque. Intenta de nuevo.'
      }
      console.error('updateBlock error:', e)
      throw e
    }
  }

  async function fetchAllBlocks() {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, 'blocks'),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      blocks.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (e) {
      error.value = 'No se pudieron cargar los bloques. Intenta de nuevo.'
      console.error('fetchAllBlocks error:', e)
    } finally {
      loading.value = false
    }
  }

  async function deleteBlock(blockId) {
    error.value = null
    try {
      await deleteDoc(doc(db, 'blocks', blockId))
      blocks.value = blocks.value.filter((b) => b.id !== blockId)
    } catch (e) {
      error.value = 'No se pudo eliminar el bloque. Intenta de nuevo.'
      console.error('deleteBlock error:', e)
      throw e
    }
  }

  return { blocks, loading, error, fetchBlocks, fetchAllBlocks, getBlock, createBlock, updateBlock, deleteBlock }
})
