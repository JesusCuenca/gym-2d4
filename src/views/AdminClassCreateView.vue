<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES } from '../models/blockTypes'

const router = useRouter()
const classStore = useClassStore()
const blockStore = useBlockStore()

const submitting = ref(false)
const name = ref('')
const description = ref('')
const selectedBlocks = ref([])

function getTypeLabel(type) {
  return BLOCK_TYPES.find((bt) => bt.value === type)?.label ?? type
}

const availableBlocks = computed(() => {
  const selectedIds = new Set(selectedBlocks.value.map((b) => b.id))
  return blockStore.blocks.filter((b) => !selectedIds.has(b.id))
})

function addBlock(block) {
  selectedBlocks.value.push({ ...block })
}

function removeBlock(index) {
  selectedBlocks.value.splice(index, 1)
}

function moveBlock(index, direction) {
  const target = index + direction
  if (target < 0 || target >= selectedBlocks.value.length) return
  const blocks = selectedBlocks.value
  ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
}

async function handleSubmit() {
  if (selectedBlocks.value.length === 0) return

  submitting.value = true
  try {
    await classStore.createClass({
      name: name.value,
      description: description.value || null,
      blocks: selectedBlocks.value.map((block, index) => ({
        blockId: block.id,
        blockData: {
          name: block.name,
          type: block.type,
          family: block.family,
          timeCapSeconds: block.timeCapSeconds,
          rounds: block.rounds,
          intervalSeconds: block.intervalSeconds,
          repScheme: block.repScheme,
          exercises: block.exercises,
        },
        order: index,
      })),
    })
    router.push({ name: 'admin-classes' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  blockStore.fetchBlocks()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">Create Class</h1>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Class Name -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Class Name</label>
        <input
          v-model="name"
          type="text"
          required
          placeholder="e.g. Monday WOD"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Description (optional)</label>
        <textarea
          v-model="description"
          rows="2"
          placeholder="Brief description of the class"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gymOrange resize-none"
        />
      </div>

      <!-- Selected Blocks (ordered) -->
      <div>
        <label class="block text-sm text-white/70 mb-3">
          Class Blocks ({{ selectedBlocks.length }})
        </label>

        <div v-if="selectedBlocks.length === 0" class="text-white/30 text-sm py-4 text-center border border-dashed border-white/10 rounded-lg">
          No blocks added yet. Select blocks below.
        </div>

        <div v-else class="space-y-2 mb-4">
          <div
            v-for="(block, index) in selectedBlocks"
            :key="block.id + '-' + index"
            class="flex items-center gap-3 bg-gymOrange/10 border border-gymOrange/30 rounded-lg px-4 py-3"
          >
            <span class="text-gymOrange font-bold text-sm w-6">{{ index + 1 }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-white font-medium text-sm truncate block">{{ block.name }}</span>
              <span class="text-white/40 text-xs">{{ getTypeLabel(block.type) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="moveBlock(index, -1)"
                :disabled="index === 0"
                class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-sm"
              >↑</button>
              <button
                type="button"
                @click="moveBlock(index, 1)"
                :disabled="index === selectedBlocks.length - 1"
                class="text-white/30 hover:text-white disabled:opacity-20 px-1 text-sm"
              >↓</button>
              <button
                type="button"
                @click="removeBlock(index)"
                class="text-red-400/70 hover:text-red-400 px-1 text-sm ml-1"
              >✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Available Blocks -->
      <div>
        <label class="block text-sm text-white/70 mb-3">Available Blocks</label>

        <div v-if="blockStore.loading" class="text-white/50 text-sm text-center py-4">
          Loading blocks...
        </div>

        <div v-else-if="availableBlocks.length === 0" class="text-white/30 text-sm py-4 text-center border border-dashed border-white/10 rounded-lg">
          {{ blockStore.blocks.length === 0 ? 'No blocks created yet.' : 'All blocks have been added.' }}
        </div>

        <div v-else class="grid gap-2">
          <button
            v-for="block in availableBlocks"
            :key="block.id"
            type="button"
            @click="addBlock(block)"
            class="text-left bg-white/5 border border-white/10 hover:border-white/30 rounded-lg px-4 py-3 transition-colors"
          >
            <div class="flex items-center justify-between">
              <span class="text-white text-sm font-medium">{{ block.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {{ getTypeLabel(block.type) }}
              </span>
            </div>
            <span class="text-white/40 text-xs">
              {{ block.exercises?.length || 0 }} exercises
            </span>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          :disabled="submitting || selectedBlocks.length === 0"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Saving...' : 'Create Class' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-classes' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
