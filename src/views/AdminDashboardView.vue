<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { useClassStore } from '../stores/classStore'
import { useScreenStore } from '../stores/screenStore'
import ScreenManager from '../components/ScreenManager.vue'
import { PlayIcon } from '@heroicons/vue/24/outline'

const blockStore = useBlockStore()
const classStore = useClassStore()
const screenStore = useScreenStore()

const loading = computed(() => blockStore.loading || classStore.loading || screenStore.loading)

onMounted(() => {
  blockStore.fetchBlocks()
  classStore.fetchClasses()
  screenStore.fetchScreens()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gymOrange mb-6">Panel</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <RouterLink
          :to="{ name: 'admin-blocks' }"
          class="bg-white/5 border border-white/10 hover:border-gymOrange/50 rounded-lg p-4 text-center transition-colors"
        >
          <div class="text-3xl font-bold text-white">{{ blockStore.blocks.length }}</div>
          <div class="text-white/50 text-sm mt-1">Bloques</div>
        </RouterLink>
        <RouterLink
          :to="{ name: 'admin-classes' }"
          class="bg-white/5 border border-white/10 hover:border-gymOrange/50 rounded-lg p-4 text-center transition-colors"
        >
          <div class="text-3xl font-bold text-white">{{ classStore.classes.length }}</div>
          <div class="text-white/50 text-sm mt-1">Clases</div>
        </RouterLink>
        <div class="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <div class="text-3xl font-bold text-white">{{ screenStore.screens.length }}</div>
          <div class="text-white/50 text-sm mt-1">Pantallas</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <h2 class="text-lg font-bold text-white mb-4">Acciones rápidas</h2>
      <div class="grid grid-cols-2 gap-3 mb-8">
        <RouterLink
          :to="{ name: 'admin-block-create' }"
          class="bg-white/5 border border-white/10 hover:border-gymOrange/50 rounded-lg p-4 text-center transition-colors"
        >
          <div class="text-gymOrange font-bold text-sm">+ Nuevo bloque</div>
        </RouterLink>
        <RouterLink
          :to="{ name: 'admin-class-create' }"
          class="bg-white/5 border border-white/10 hover:border-gymOrange/50 rounded-lg p-4 text-center transition-colors"
        >
          <div class="text-gymOrange font-bold text-sm">+ Nueva clase</div>
        </RouterLink>
      </div>

      <!-- Recent Classes -->
      <div v-if="classStore.classes.length > 0">
        <h2 class="text-lg font-bold text-white mb-4">Clases recientes</h2>
        <div class="space-y-2">
          <div
            v-for="cls in classStore.classes.slice(0, 5)"
            :key="cls.id"
            class="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3"
          >
            <div>
              <span class="text-white font-medium text-sm">{{ cls.name }}</span>
              <span class="text-white/40 text-xs ml-2">{{ cls.blocks?.length || 0 }} bloques</span>
            </div>
            <RouterLink
              :to="{ name: 'admin-class-live', params: { id: cls.id } }"
              class="flex items-center gap-1.5 text-xs bg-gymOrange/20 text-gymOrange hover:bg-gymOrange/30 rounded-lg px-3 py-1.5 font-medium transition-colors"
            >
              <PlayIcon class="w-3.5 h-3.5" />
              Iniciar
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Screens Section -->
      <div class="mt-8">
        <h2 class="text-lg font-bold text-white mb-4">Pantallas</h2>
        <ScreenManager />
      </div>
    </template>
  </div>
</template>
