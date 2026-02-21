<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/userStore'
import { useToastStore } from '../stores/toastStore'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

const editing = ref(false)
const editName = ref('')
const submitting = ref(false)

function startEdit() {
  editName.value = userStore.profile?.displayName || ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!editName.value.trim()) return

  submitting.value = true
  try {
    await userStore.updateProfile(authStore.user.uid, {
      displayName: editName.value.trim(),
    })
    editing.value = false
    toastStore.show('Perfil actualizado')
  } catch {
    // error shown via userStore.error
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!userStore.profile) {
    userStore.fetchProfile(authStore.user.uid)
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gymOrange mb-6">Mi perfil</h1>

    <div v-if="userStore.loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <div v-else class="bg-white/5 border border-white/10 rounded-lg p-6 max-w-md">
      <div v-if="userStore.error" class="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
        {{ userStore.error }}
      </div>

      <!-- Display Name -->
      <div class="mb-4">
        <label class="block text-sm text-white/60 mb-1">Nombre</label>
        <div v-if="!editing" class="flex items-center justify-between">
          <span class="text-white text-lg font-medium">{{ userStore.profile?.displayName }}</span>
          <button
            @click="startEdit"
            class="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <PencilSquareIcon class="w-4 h-4" />
            Editar
          </button>
        </div>
        <div v-else class="space-y-3">
          <input
            v-model="editName"
            type="text"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gymOrange"
          />
          <div class="flex gap-2">
            <button
              @click="saveEdit"
              :disabled="submitting"
              class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
            >
              {{ submitting ? 'Guardando...' : 'Guardar' }}
            </button>
            <button
              @click="cancelEdit"
              class="text-white/50 hover:text-white border border-white/20 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <!-- Email (read-only) -->
      <div>
        <label class="block text-sm text-white/60 mb-1">Email</label>
        <span class="text-white/70">{{ authStore.user?.email }}</span>
      </div>
    </div>
  </div>
</template>
