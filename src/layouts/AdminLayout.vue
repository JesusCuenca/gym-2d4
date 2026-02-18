<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useConnectionStatus } from '../composables/useConnectionStatus'

const router = useRouter()
const authStore = useAuthStore()
const menuOpen = ref(false)
const { isOnline } = useConnectionStatus()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav class="bg-gymBlack border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
      <div class="flex items-center justify-between">
        <span class="text-gymOrange font-bold text-xl">2D4 Gym TV</span>

        <!-- Desktop nav -->
        <div class="hidden sm:flex items-center gap-6">
          <RouterLink to="/admin" class="text-white/70 hover:text-white text-sm">Panel</RouterLink>
          <RouterLink to="/admin/bloques" class="text-white/70 hover:text-white text-sm">Bloques</RouterLink>
          <RouterLink to="/admin/clases" class="text-white/70 hover:text-white text-sm">Clases</RouterLink>
          <span class="text-white/50 text-sm">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-white/50 hover:text-white text-sm">
            Cerrar sesión
          </button>
        </div>

        <!-- Mobile hamburger -->
        <button
          @click="menuOpen = !menuOpen"
          class="sm:hidden text-white/70 hover:text-white p-1"
        >
          <svg v-if="!menuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      <div v-if="menuOpen" class="sm:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-3">
        <RouterLink to="/admin" class="text-white/70 hover:text-white text-sm" @click="closeMenu">Panel</RouterLink>
        <RouterLink to="/admin/bloques" class="text-white/70 hover:text-white text-sm" @click="closeMenu">Bloques</RouterLink>
        <RouterLink to="/admin/clases" class="text-white/70 hover:text-white text-sm" @click="closeMenu">Clases</RouterLink>
        <div class="pt-2 border-t border-white/10 flex items-center justify-between">
          <span class="text-white/50 text-xs truncate">{{ authStore.user?.email }}</span>
          <button @click="handleLogout" class="text-white/50 hover:text-white text-sm shrink-0">
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
    <!-- Offline banner -->
    <div v-if="!isOnline" class="bg-red-600 text-white text-center text-sm py-2 px-4">
      Sin conexión — Reconectando...
    </div>
    <main class="flex-1 p-4 sm:p-6 w-full max-w-5xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>
