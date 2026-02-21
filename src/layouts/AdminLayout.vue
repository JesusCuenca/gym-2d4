<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/userStore'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import {
  Bars3Icon,
  XMarkIcon,
  Squares2X2Icon,
  CubeIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const menuOpen = ref(false)
const { isOnline } = useConnectionStatus()

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

async function handleLogout() {
  closeMenu()
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
        <RouterLink to="/admin" class="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img src="/gym-2d4-logo.jpg" alt="2D4 Gym" class="h-8 w-8 object-contain rounded-md" />
          <span class="text-gymOrange font-bold text-xl">2D4 Gym TV</span>
        </RouterLink>

        <!-- Desktop nav -->
        <div class="hidden sm:flex items-center gap-6">
          <RouterLink to="/admin" active-class="" exact-active-class="router-link-exact-active" class="nav-link">
            <Squares2X2Icon class="w-4 h-4" />
            Panel
          </RouterLink>
          <RouterLink to="/admin/bloques" class="nav-link">
            <CubeIcon class="w-4 h-4" />
            Bloques
          </RouterLink>
          <RouterLink to="/admin/clases" class="nav-link">
            <CalendarDaysIcon class="w-4 h-4" />
            Clases
          </RouterLink>
          <RouterLink to="/admin/perfil" class="nav-link">
            <UserCircleIcon class="w-4 h-4" />
            {{ userStore.profile?.displayName || authStore.user?.email }}
          </RouterLink>
          <button @click="handleLogout" class="nav-link">
            <ArrowRightOnRectangleIcon class="w-4 h-4" />
            Salir
          </button>
        </div>

        <!-- Mobile hamburger -->
        <button
          @click="menuOpen = !menuOpen"
          class="sm:hidden text-white/70 hover:text-white p-1"
        >
          <Bars3Icon v-if="!menuOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </nav>

    <!-- Mobile menu overlay -->
    <Teleport to="body">
      <Transition name="mobile-menu">
        <div
          v-if="menuOpen"
          class="fixed inset-0 z-30 sm:hidden"
          @click.self="closeMenu"
        >
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeMenu" />

          <div class="relative bg-gymBlack border-b border-white/10 px-4 py-4 z-40">
            <div class="flex items-center justify-between mb-4">
              <span class="text-gymOrange font-bold text-xl flex items-center gap-2">
                <img src="/gym-2d4-logo.jpg" alt="2D4 Gym" class="h-8 w-8 object-contain rounded-md" />
                2D4 Gym TV
              </span>
              <button @click="closeMenu" class="text-white/60 hover:text-white p-1">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <nav class="flex flex-col gap-1 mb-4">
              <RouterLink
                to="/admin"
                active-class=""
                exact-active-class="router-link-exact-active"
                class="nav-link py-3 text-base border-b border-white/5"
                @click="closeMenu"
              >
                <Squares2X2Icon class="w-5 h-5" />
                Panel
              </RouterLink>
              <RouterLink
                to="/admin/bloques"
                class="nav-link py-3 text-base border-b border-white/5"
                @click="closeMenu"
              >
                <CubeIcon class="w-5 h-5" />
                Bloques
              </RouterLink>
              <RouterLink
                to="/admin/clases"
                class="nav-link py-3 text-base"
                @click="closeMenu"
              >
                <CalendarDaysIcon class="w-5 h-5" />
                Clases
              </RouterLink>
            </nav>

            <div class="pt-3 border-t border-white/10 flex items-center justify-between">
              <RouterLink to="/admin/perfil" class="text-white/40 text-sm truncate hover:text-white transition-colors" @click="closeMenu">
                {{ userStore.profile?.displayName || authStore.user?.email }}
              </RouterLink>
              <button @click="handleLogout" class="nav-link text-base">
                <ArrowRightOnRectangleIcon class="w-5 h-5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Offline banner -->
    <div v-if="!isOnline" class="bg-red-600 text-white text-center text-sm py-2 px-4">
      Sin conexión — Reconectando...
    </div>
    <main class="flex-1 p-4 sm:p-6 w-full max-w-5xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>
