import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db, serverTimestamp } from '../firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

export const useUserStore = defineStore('user', () => {
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const hasProfile = computed(() => !!profile.value?.displayName)

  async function fetchProfile(uid) {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDoc(doc(db, 'users', uid))
      profile.value = snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null
    } catch (e) {
      error.value = 'No se pudo cargar el perfil.'
      console.error('fetchProfile error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createProfile(uid, data) {
    error.value = null
    try {
      await setDoc(doc(db, 'users', uid), {
        ...data,
        createdAt: serverTimestamp(),
      })
      profile.value = { uid, ...data }
    } catch (e) {
      error.value = 'No se pudo crear el perfil.'
      console.error('createProfile error:', e)
      throw e
    }
  }

  async function updateProfile(uid, data) {
    error.value = null
    try {
      await updateDoc(doc(db, 'users', uid), data)
      profile.value = { ...profile.value, ...data }
    } catch (e) {
      error.value = 'No se pudo actualizar el perfil.'
      console.error('updateProfile error:', e)
      throw e
    }
  }

  function clearProfile() {
    profile.value = null
  }

  return { profile, loading, error, hasProfile, fetchProfile, createProfile, updateProfile, clearProfile }
})
