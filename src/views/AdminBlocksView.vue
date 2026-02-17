<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES } from '../models/blockTypes'

const blockStore = useBlockStore()

function getTypeLabel(type) {
  return BLOCK_TYPES.find((bt) => bt.value === type)?.label ?? type
}

function getFamilyLabel(family) {
  return family === 'timeBased' ? 'Time-Based' : 'Rep-Based'
}

async function handleDelete(block) {
  if (confirm(`Delete "${block.name}"?`)) {
    await blockStore.deleteBlock(block.id)
  }
}

onMounted(() => {
  blockStore.fetchBlocks()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gymOrange">Blocks</h1>
      <RouterLink
        :to="{ name: 'admin-block-create' }"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
      >
        + New Block
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="blockStore.loading" class="text-white/50 text-center py-12">
      Loading...
    </div>

    <!-- Empty state -->
    <div v-else-if="blockStore.blocks.length === 0" class="text-center py-12">
      <p class="text-white/50 mb-4">No blocks yet. Create your first exercise block.</p>
      <RouterLink
        :to="{ name: 'admin-block-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Create Block
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
            {{ getTypeLabel(block.type) }}
          </span>
        </div>

        <p class="text-white/50 text-sm mb-3">
          {{ getFamilyLabel(block.family) }}
          <span v-if="block.timeCapSeconds"> · {{ Math.floor(block.timeCapSeconds / 60) }} min</span>
          <span v-if="block.rounds"> · {{ block.rounds }} rounds</span>
          <span v-if="block.repScheme"> · {{ block.repScheme }}</span>
        </p>

        <div class="text-white/40 text-sm mb-4">
          {{ block.exercises?.length || 0 }} exercise{{ (block.exercises?.length || 0) !== 1 ? 's' : '' }}
          <span v-if="block.exercises?.length" class="text-white/30">
            — {{ block.exercises.map((e) => e.name).join(', ') }}
          </span>
        </div>

        <div class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-block-edit', params: { id: block.id } }"
            class="text-sm text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Edit
          </RouterLink>
          <button
            @click="handleDelete(block)"
            class="text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
