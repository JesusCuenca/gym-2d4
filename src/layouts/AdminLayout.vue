<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav class="bg-gymBlack border-b border-white/10 px-6 py-4 flex items-center gap-6">
      <span class="text-gymOrange font-bold text-xl">2D4 Gym TV</span>
      <RouterLink to="/admin" class="text-white/70 hover:text-white text-sm">Dashboard</RouterLink>
      <RouterLink to="/admin/bloques" class="text-white/70 hover:text-white text-sm">Blocks</RouterLink>
      <RouterLink to="/admin/clases" class="text-white/70 hover:text-white text-sm">Classes</RouterLink>
      <div class="ml-auto flex items-center gap-4">
        <span class="text-white/50 text-sm">{{ authStore.user?.email }}</span>
        <button
          @click="handleLogout"
          class="text-white/50 hover:text-white text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
    <main class="flex-1 p-6">
      <RouterView />
    </main>
  </div>
</template>
