<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { getBlockLabel } from '../models/blockTypes'
import { getTotalDuration } from '../utils/timeline'

const classStore = useClassStore()

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
  if (confirm(`¿Eliminar "${cls.name}"?`)) {
    await classStore.deleteClass(cls.id)
  }
}

async function handleClone(cls) {
  await classStore.createClass({
    name: `${cls.name} (copia)`,
    description: cls.description,
    blocks: cls.blocks,
  })
  await classStore.fetchClasses()
}

onMounted(() => {
  classStore.fetchClasses()
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

    <!-- Loading -->
    <div v-if="classStore.loading" class="text-white/50 text-center py-12">
      Cargando...
    </div>

    <!-- Empty state -->
    <div v-else-if="classStore.classes.length === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No hay clases todavía. Crea tu primera clase.</p>
      <RouterLink
        :to="{ name: 'admin-class-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Crear clase
      </RouterLink>
    </div>

    <!-- Class list -->
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="cls in classStore.classes"
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
        <div v-if="cls.blocks?.length" class="flex flex-wrap gap-1 mb-4">
          <span
            v-for="(block, i) in cls.blocks"
            :key="i"
            class="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60"
          >
            {{ block.blockData?.name || 'Bloque' }}
          </span>
        </div>

        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-class-live', params: { id: cls.id } }"
            class="text-sm bg-gymOrange/20 text-gymOrange hover:bg-gymOrange/30 border border-gymOrange/30 rounded-lg px-3 py-1.5 font-medium transition-colors"
          >
            Iniciar
          </RouterLink>
          <RouterLink
            :to="{ name: 'admin-class-edit', params: { id: cls.id } }"
            class="text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Editar
          </RouterLink>
          <button
            @click="handleClone(cls)"
            class="text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Clonar
          </button>
          <button
            @click="handleDelete(cls)"
            class="text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
