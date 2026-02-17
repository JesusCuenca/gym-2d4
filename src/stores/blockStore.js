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
import { getFamilyForType } from '../models/blockTypes'

export const useBlockStore = defineStore('blocks', () => {
  const blocks = ref([])
  const loading = ref(false)

  async function fetchBlocks() {
    const authStore = useAuthStore()
    loading.value = true
    try {
      const q = query(
        collection(db, 'blocks'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      blocks.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function getBlock(blockId) {
    const snapshot = await getDoc(doc(db, 'blocks', blockId))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() }
  }

  async function createBlock(blockData) {
    const authStore = useAuthStore()
    const docRef = await addDoc(collection(db, 'blocks'), {
      ...blockData,
      family: getFamilyForType(blockData.type),
      uid: authStore.user.uid,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }

  async function updateBlock(blockId, blockData) {
    await updateDoc(doc(db, 'blocks', blockId), {
      ...blockData,
      family: getFamilyForType(blockData.type),
    })
  }

  async function deleteBlock(blockId) {
    await deleteDoc(doc(db, 'blocks', blockId))
    blocks.value = blocks.value.filter((b) => b.id !== blockId)
  }

  return { blocks, loading, fetchBlocks, getBlock, createBlock, updateBlock, deleteBlock }
})
