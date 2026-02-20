<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const displayName = ref(userStore.profile?.displayName || '')
const submitting = ref(false)
const localError = ref(null)

async function handleSubmit() {
  if (!displayName.value.trim()) {
    localError.value = 'El nombre es obligatorio.'
    return
  }

  submitting.value = true
  localError.value = null
  try {
    const uid = authStore.user.uid
    const data = {
      displayName: displayName.value.trim(),
      email: authStore.user.email,
    }

    if (userStore.profile) {
      await userStore.updateProfile(uid, data)
    } else {
      await userStore.createProfile(uid, data)
    }

    router.replace({ name: 'admin-dashboard' })
  } catch {
    localError.value = userStore.error || 'Error al guardar el perfil.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <form @submit.prevent="handleSubmit" class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gymOrange">Completa tu perfil</h1>
        <p class="text-white/50 text-sm mt-2">Antes de continuar, necesitamos tu nombre.</p>
      </div>

      <div v-if="localError" class="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
        {{ localError }}
      </div>

      <div>
        <label for="displayName" class="block text-sm text-white/70 mb-1">Nombre completo</label>
        <input
          id="displayName"
          v-model="displayName"
          type="text"
          required
          autocomplete="name"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
          placeholder="Juan Pérez"
        />
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
      >
        {{ submitting ? 'Guardando...' : 'Continuar' }}
      </button>
    </form>
  </div>
</template>
