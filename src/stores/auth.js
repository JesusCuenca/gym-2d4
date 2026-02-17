import { ref } from 'vue'
import { defineStore } from 'pinia'
import { auth } from '../firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = ref(false)
  const loading = ref(true)
  const error = ref(null)

  function initAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
          ? { uid: firebaseUser.uid, email: firebaseUser.email }
          : null
        isLoggedIn.value = !!firebaseUser
        loading.value = false
        resolve()
      })
    })
  }

  async function login(email, password) {
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, isLoggedIn, loading, error, initAuth, login, logout }
})
