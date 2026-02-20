<script setup>
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { useListFilters } from '../composables/useListFilters'
import { getBlockLabel } from '../models/blockTypes'
import { formatTimer } from '../utils/time'
import ListFilterBar from '../components/ListFilterBar.vue'
import { PencilSquareIcon, DocumentDuplicateIcon, TrashIcon } from '@heroicons/vue/24/outline'

const blockStore = useBlockStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

const {
  searchText, userMode, selectedUserUids, dateFrom, dateTo,
  typeFilter, subtypeFilter,
  currentPage, totalPages, totalFilteredCount, paginatedItems,
  nextPage, prevPage, clearFilters, hasActiveFilters,
} = useListFilters({
  items: computed(() => blockStore.blocks),
  currentUserUid: computed(() => authStore.user?.uid),
})

async function handleDelete(block) {
  const ok = await confirm({
    title: 'Eliminar bloque',
    message: `"${block.name}" será eliminado permanentemente.`,
  })
  if (ok) {
    await blockStore.deleteBlock(block.id)
    toastStore.show('Bloque eliminado')
  }
}

async function handleClone(block) {
  const { id, createdAt, ...data } = block
  await blockStore.createBlock({
    ...data,
    name: `${block.name} (copia)`,
  })
  await blockStore.fetchAllBlocks()
  toastStore.show('Bloque duplicado')
}

function blockMeta(block) {
  const parts = []
  if (block.type === 'timed') {
    if (block.workSeconds) parts.push(formatTimer(block.workSeconds * (block.rounds || 1)))
    if (block.rounds > 1) parts.push(`${block.rounds} rondas`)
  } else {
    if (block.rounds) parts.push(`${block.rounds} rondas`)
    if (block.repsEveryRound) parts.push(`${block.repsEveryRound} reps`)
    if (block.repsPerRound?.length) parts.push(block.repsPerRound.join('-'))
  }
  return parts.join(' · ')
}

onMounted(() => {
  userStore.fetchAllUsers()
  blockStore.fetchAllBlocks()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gymOrange">Bloques</h1>
      <RouterLink
        :to="{ name: 'admin-block-create' }"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
      >
        + Nuevo bloque
      </RouterLink>
    </div>

    <!-- Filters & pagination -->
    <ListFilterBar
      v-model:searchText="searchText"
      v-model:userMode="userMode"
      v-model:selectedUserUids="selectedUserUids"
      v-model:dateFrom="dateFrom"
      v-model:dateTo="dateTo"
      v-model:typeFilter="typeFilter"
      v-model:subtypeFilter="subtypeFilter"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :totalFilteredCount="totalFilteredCount"
      :showTypeFilter="true"
      :allUsers="userStore.allUsers"
      :currentUserUid="authStore.user?.uid"
      :hasActiveFilters="hasActiveFilters"
      @nextPage="nextPage"
      @prevPage="prevPage"
      @clearFilters="clearFilters"
    />

    <!-- Loading -->
    <div v-if="blockStore.loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <!-- Empty state: no data at all -->
    <div v-else-if="blockStore.blocks.length === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay bloques todavía. Crea tu primer bloque de ejercicios.</p>
      <RouterLink
        :to="{ name: 'admin-block-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Crear bloque
      </RouterLink>
    </div>

    <!-- Empty state: filters produced no results -->
    <div v-else-if="totalFilteredCount === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay resultados para estos filtros.</p>
      <button @click="clearFilters" class="text-gymOrange text-sm hover:underline">
        Limpiar filtros
      </button>
    </div>

    <!-- Block list -->
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
        v-for="block in paginatedItems"
        :key="block.id"
        class="bg-white/5 border border-white/10 rounded-lg p-4"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-bold text-white text-lg">{{ block.name }}</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-gymOrange/20 text-gymOrange font-medium">
            {{ getBlockLabel(block) }}
          </span>
        </div>

        <p v-if="blockMeta(block)" class="text-white/50 text-sm mb-3">
          {{ blockMeta(block) }}
        </p>

        <div class="text-white/40 text-sm mb-3">
          {{ block.exercises?.length || 0 }} ejercicio{{ (block.exercises?.length || 0) !== 1 ? 's' : '' }}
          <span v-if="block.exercises?.length" class="text-white/30">
            — {{ block.exercises.map((e) => e.name).join(', ') }}
          </span>
        </div>

        <div class="text-white/30 text-xs mb-4">
          Creado por {{ userStore.getUserName(block.uid) }}
        </div>

        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-block-edit', params: { id: block.id } }"
            class="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <PencilSquareIcon class="w-4 h-4" />
            Editar
          </RouterLink>
          <button
            @click="handleClone(block)"
            class="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <DocumentDuplicateIcon class="w-4 h-4" />
            Clonar
          </button>
          <button
            @click="handleDelete(block)"
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
