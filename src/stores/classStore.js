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

export const useClassStore = defineStore('classes', () => {
  const classes = ref([])
  const loading = ref(false)

  async function fetchClasses() {
    const authStore = useAuthStore()
    loading.value = true
    try {
      const q = query(
        collection(db, 'classes'),
        where('uid', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      classes.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  async function getClassById(classId) {
    const snapshot = await getDoc(doc(db, 'classes', classId))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() }
  }

  async function createClass(classData) {
    const authStore = useAuthStore()
    const docRef = await addDoc(collection(db, 'classes'), {
      ...classData,
      uid: authStore.user.uid,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }

  async function updateClass(classId, classData) {
    await updateDoc(doc(db, 'classes', classId), classData)
  }

  async function deleteClass(classId) {
    await deleteDoc(doc(db, 'classes', classId))
    classes.value = classes.value.filter((c) => c.id !== classId)
  }

  return { classes, loading, fetchClasses, getClassById, createClass, updateClass, deleteClass }
})
