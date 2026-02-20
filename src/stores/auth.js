import { ref } from 'vue'
import { defineStore } from 'pinia'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { useUserStore } from './userStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = ref(false)
  const loading = ref(true)
  const error = ref(null)

  function initAuth() {
    const AUTH_TIMEOUT_MS = 5000

    const authPromise = new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null
        isLoggedIn.value = !!firebaseUser
        loading.value = false
        resolve()
      })
    })

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (loading.value) {
          console.warn('Auth initialization timed out after', AUTH_TIMEOUT_MS, 'ms')
          user.value = null
          isLoggedIn.value = false
          loading.value = false
        }
        resolve()
      }, AUTH_TIMEOUT_MS)
    })

    return Promise.race([authPromise, timeoutPromise])
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
    const userStore = useUserStore()
    userStore.clearProfile()
    await signOut(auth)
  }

  return { user, isLoggedIn, loading, error, initAuth, login, logout }
})
