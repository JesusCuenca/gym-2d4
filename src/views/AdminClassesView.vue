<script setup>
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { useListFilters } from '../composables/useListFilters'
import { getTotalDuration } from '../utils/timeline'
import ListFilterBar from '../components/ListFilterBar.vue'
import {
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline'

const classStore = useClassStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

const {
  searchText, userMode, selectedUserUids, dateFrom, dateTo,
  currentPage, totalPages, totalFilteredCount, paginatedItems,
  nextPage, prevPage, clearFilters, hasActiveFilters,
} = useListFilters({
  items: computed(() => classStore.classes),
  currentUserUid: computed(() => authStore.user?.uid),
})

function getTotalTime(cls) {
  return cls.blocks?.reduce((sum, b) => {
    const d = b.blockData ? getTotalDuration(b.blockData) : null
    return sum + (d || 0)
  }, 0) || 0
}

function formatMinutes(seconds) {
  if (!seconds) return ''
  return `${Math.floor(seconds / 60)} min`
}

async function handleDelete(cls) {
  const ok = await confirm({
    title: 'Eliminar clase',
    message: `"${cls.name}" será eliminada permanentemente.`,
  })
  if (ok) {
    await classStore.deleteClass(cls.id)
    toastStore.show('Clase eliminada')
  }
}

async function handleClone(cls) {
  await classStore.createClass({
    name: `${cls.name} (copia)`,
    description: cls.description,
    blocks: cls.blocks,
  })
  await classStore.fetchAllClasses()
  toastStore.show('Clase duplicada')
}

onMounted(() => {
  userStore.fetchAllUsers()
  classStore.fetchAllClasses()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gymOrange">Clases</h1>
      <RouterLink
        :to="{ name: 'admin-class-create' }"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
      >
        + Nueva clase
      </RouterLink>
    </div>

    <!-- Filters & pagination -->
    <ListFilterBar
      v-model:searchText="searchText"
      v-model:userMode="userMode"
      v-model:selectedUserUids="selectedUserUids"
      v-model:dateFrom="dateFrom"
      v-model:dateTo="dateTo"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :totalFilteredCount="totalFilteredCount"
      :showTypeFilter="false"
      :allUsers="userStore.allUsers"
      :currentUserUid="authStore.user?.uid"
      :hasActiveFilters="hasActiveFilters"
      @nextPage="nextPage"
      @prevPage="prevPage"
      @clearFilters="clearFilters"
    />

    <!-- Loading -->
    <div v-if="classStore.loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <!-- Empty state: no data at all -->
    <div v-else-if="classStore.classes.length === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay clases todavía. Crea tu primera clase.</p>
      <RouterLink
        :to="{ name: 'admin-class-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Crear clase
      </RouterLink>
    </div>

    <!-- Empty state: filters produced no results -->
    <div v-else-if="totalFilteredCount === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay resultados para estos filtros.</p>
      <button @click="clearFilters" class="text-gymOrange text-sm hover:underline">
        Limpiar filtros
      </button>
    </div>

    <!-- Class list -->
    <TransitionGroup
      v-else
      tag="div"
      class="grid gap-4 sm:grid-cols-2"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
      move-class="transition-all duration-300 ease-out"
    >
      <div
        v-for="cls in paginatedItems"
        :key="cls.id"
        class="bg-white/5 border border-white/10 rounded-lg p-4"
      >
        <h3 class="font-bold text-white text-lg mb-1">{{ cls.name }}</h3>
        <p v-if="cls.description" class="text-white/40 text-sm mb-3">{{ cls.description }}</p>

        <div class="text-white/50 text-sm mb-3">
          {{ cls.blocks?.length || 0 }} bloque{{ (cls.blocks?.length || 0) !== 1 ? 's' : '' }}
          <span v-if="getTotalTime(cls)"> · ~{{ formatMinutes(getTotalTime(cls)) }}</span>
        </div>

        <!-- Block preview -->
        <div v-if="cls.blocks?.length" class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="(block, i) in cls.blocks"
            :key="i"
            class="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60"
          >
            {{ block.blockData?.name || 'Bloque' }}
          </span>
        </div>

        <div class="text-white/30 text-xs mb-4">
          Creado por {{ userStore.getUserName(cls.uid) }}
        </div>

        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-class-live', params: { id: cls.id } }"
            class="flex items-center gap-1.5 text-sm bg-gymOrange/20 text-gymOrange hover:bg-gymOrange/30 border border-gymOrange/30 rounded-lg px-3 py-1.5 font-medium transition-colors"
          >
            <PlayIcon class="w-4 h-4" />
            Iniciar
          </RouterLink>
          <RouterLink
            :to="{ name: 'admin-class-edit', params: { id: cls.id } }"
            class="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <PencilSquareIcon class="w-4 h-4" />
            Editar
          </RouterLink>
          <button
            @click="handleClone(cls)"
            class="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <DocumentDuplicateIcon class="w-4 h-4" />
            Clonar
          </button>
          <button
            @click="handleDelete(cls)"
            class="flex items-center gap-1.5 text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            <TrashIcon class="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
