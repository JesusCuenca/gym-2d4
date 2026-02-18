<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { getBlockLabel } from '../models/blockTypes'
import { formatTimer } from '../utils/time'

const blockStore = useBlockStore()

async function handleDelete(block) {
  if (confirm(`¿Eliminar "${block.name}"?`)) {
    await blockStore.deleteBlock(block.id)
  }
}

async function handleClone(block) {
  const { id, createdAt, ...data } = block
  await blockStore.createBlock({
    ...data,
    name: `${block.name} (copia)`,
  })
  await blockStore.fetchBlocks()
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
  blockStore.fetchBlocks()
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

    <!-- Loading -->
    <div v-if="blockStore.loading" class="text-white/50 text-center py-12">
      Cargando...
    </div>

    <!-- Empty state -->
    <div v-else-if="blockStore.blocks.length === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay bloques todavía. Crea tu primer bloque de ejercicios.</p>
      <RouterLink
        :to="{ name: 'admin-block-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Crear bloque
      </RouterLink>
    </div>

    <!-- Block list -->
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="block in blockStore.blocks"
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

        <div class="text-white/40 text-sm mb-4">
          {{ block.exercises?.length || 0 }} ejercicio{{ (block.exercises?.length || 0) !== 1 ? 's' : '' }}
          <span v-if="block.exercises?.length" class="text-white/30">
            — {{ block.exercises.map((e) => e.name).join(', ') }}
          </span>
        </div>

        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-block-edit', params: { id: block.id } }"
            class="text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Editar
          </RouterLink>
          <button
            @click="handleClone(block)"
            class="text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Clonar
          </button>
          <button
            @click="handleDelete(block)"
            class="text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
