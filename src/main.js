import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import AppSpinner from './components/AppSpinner.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.component('AppSpinner', AppSpinner)

import { useAuthStore } from './stores/auth'
import { useUserStore } from './stores/userStore'
const authStore = useAuthStore()
const userStore = useUserStore()
authStore
  .initAuth()
  .then(async () => {
    if (authStore.isLoggedIn) {
      await userStore.fetchProfile(authStore.user.uid)
    }
  })
  .catch((e) => {
    console.error('Auth initialization failed:', e)
  })
  .then(() => {
    app.use(router)
    app.mount('#app')
  })
