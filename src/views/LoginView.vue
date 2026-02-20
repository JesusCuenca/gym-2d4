<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  try {
    await authStore.login(email.value, password.value)
    await userStore.fetchProfile(authStore.user.uid)
    router.push('/admin')
  } catch {
    // error is already set in authStore
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4">
    <form @submit.prevent="handleSubmit" class="w-full max-w-sm space-y-6">
      <h1 class="text-3xl font-bold text-gymOrange text-center">2D4 Gym TV</h1>

      <div v-if="authStore.error" class="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
        {{ authStore.error }}
      </div>

      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm text-white/70 mb-1">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
            placeholder="admin@gym.com"
          />
        </div>

        <div>
          <label for="password" class="block text-sm text-white/70 mb-1">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
      >
        {{ submitting ? 'Entrando...' : 'Iniciar sesión' }}
      </button>
    </form>
  </div>
</template>
