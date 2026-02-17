<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav class="bg-gymBlack border-b border-white/10 px-6 py-4 flex items-center gap-6">
      <span class="text-gymOrange font-bold text-xl">GymFlow TV</span>
      <RouterLink to="/admin" class="text-white/70 hover:text-white text-sm">Dashboard</RouterLink>
      <RouterLink to="/admin/bloques" class="text-white/70 hover:text-white text-sm">Bloques</RouterLink>
      <RouterLink to="/admin/clases" class="text-white/70 hover:text-white text-sm">Clases</RouterLink>
    </nav>
    <main class="flex-1 p-6">
      <RouterView />
    </main>
  </div>
</template>
