<script setup>
import { ref, computed, watch } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import { useBlockPicker } from '../composables/useBlockPicker'
import { useBlockStore } from '../stores/blockStore'
import { BLOCK_TYPES, TIMED_SUBTYPES, REPS_SUBTYPES, getBlockLabel, getRepsSubcase } from '../models/blockTypes'

const { state, respond, cancel } = useBlockPicker()
const blockStore = useBlockStore()

const searchQuery = ref('')
const selectedType = ref(null)
const selectedSubtype = ref(null)
const selectedSet = ref(new Set())

watch(
  () => state.value.open,
  (open) => {
    if (open) {
      searchQuery.value = ''
      selectedType.value = null
      selectedSubtype.value = null
      selectedSet.value = new Set()
    }
  },
)

const subtypeOptions = computed(() => {
  if (selectedType.value === 'timed') return TIMED_SUBTYPES
  if (selectedType.value === 'reps') return REPS_SUBTYPES
  return []
})

const filteredBlocks = computed(() => {
  let result = blockStore.blocks

  if (selectedType.value) {
    result = result.filter((b) => b.type === selectedType.value)
  }

  if (selectedSubtype.value) {
    result = result.filter((b) => {
      if (b.type === 'reps') return getRepsSubcase(b) === selectedSubtype.value
      const sub = b.subtype || 'custom'
      return sub === selectedSubtype.value
    })
  }

  if (searchQuery.value.trim()) {
    const needle = searchQuery.value.trim().toLowerCase()
    result = result.filter((b) => b.name?.toLowerCase().includes(needle))
  }

  return result
})

function toggleType(type) {
  if (selectedType.value === type) {
    selectedType.value = null
    selectedSubtype.value = null
  } else {
    selectedType.value = type
    selectedSubtype.value = null
  }
}

function toggleSubtype(subtype) {
  selectedSubtype.value = selectedSubtype.value === subtype ? null : subtype
}

function toggleBlock(block) {
  const next = new Set(selectedSet.value)
  if (next.has(block.id)) {
    next.delete(block.id)
  } else {
    next.add(block.id)
  }
  selectedSet.value = next
}

function handleConfirm() {
  const picked = blockStore.blocks.filter((b) => selectedSet.value.has(b.id))
  respond(picked)
}

function exerciseCount(block) {
  return block.exercises?.length || 0
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.open"
        class="fixed inset-0 z-40 bg-black/60"
        @click="cancel"
      />
    </Transition>

    <!-- Sheet -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="state.open"
        class="fixed bottom-0 inset-x-0 z-40 flex flex-col max-h-[88vh] max-w-lg mx-auto w-full bg-[#111111] rounded-t-2xl shadow-2xl"
      >
        <!-- Drag handle -->
        <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-2 pb-3 border-b border-white/10 flex-shrink-0">
          <h2 class="text-white font-bold text-base">Añadir bloques</h2>
          <button @click="cancel" class="text-white/60 hover:text-white transition-colors p-1">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Search -->
        <div class="px-4 pt-3 pb-2 flex-shrink-0">
          <div class="relative">
            <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar bloque..."
              class="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gymOrange"
            />
          </div>
        </div>

        <!-- Type chips -->
        <div class="px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          <div class="flex gap-2 min-w-max">
            <button
              v-for="bt in BLOCK_TYPES"
              :key="bt.value"
              type="button"
              @click="toggleType(bt.value)"
              class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
              :class="
                selectedType === bt.value
                  ? 'bg-gymOrange text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              "
            >
              {{ bt.label }}
            </button>
          </div>
        </div>

        <!-- Subtype chips -->
        <div
          v-if="subtypeOptions.length"
          class="px-4 pb-3 overflow-x-auto scrollbar-hide flex-shrink-0"
        >
          <div class="flex gap-2 min-w-max">
            <button
              v-for="st in subtypeOptions"
              :key="st.value"
              type="button"
              @click="toggleSubtype(st.value)"
              class="px-3 py-1 rounded-full text-xs transition-colors whitespace-nowrap"
              :class="
                selectedSubtype === st.value
                  ? 'bg-gymOrange/80 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/15'
              "
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <!-- Block list -->
        <div class="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          <div v-if="blockStore.loading" class="text-center text-white/50 text-sm py-10">
            Cargando bloques...
          </div>
          <div v-else-if="filteredBlocks.length === 0" class="text-center text-white/50 text-sm py-10">
            No hay bloques con ese filtro.
          </div>
          <div
            v-for="block in filteredBlocks"
            :key="block.id"
            @click="toggleBlock(block)"
            class="flex items-center gap-3 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 -mx-4 px-4 transition-colors"
          >
            <!-- Checkbox -->
            <div
              class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors"
              :class="
                selectedSet.has(block.id)
                  ? 'bg-gymOrange border-gymOrange'
                  : 'border-white/30 bg-transparent'
              "
            >
              <svg
                v-if="selectedSet.has(block.id)"
                class="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <!-- Name + info -->
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">{{ block.name }}</p>
              <p class="text-white/50 text-xs mt-0.5 truncate">
                {{ exerciseCount(block) }} ejercicio{{ exerciseCount(block) !== 1 ? 's' : '' }}
                <span v-if="block.rounds && block.rounds > 1"> · {{ block.rounds }} rondas</span>
              </p>
            </div>

            <!-- Type label -->
            <span class="text-gymOrange text-xs font-bold flex-shrink-0">{{ getBlockLabel(block) }}</span>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="px-4 py-4 border-t border-white/10 flex-shrink-0">
          <button
            type="button"
            @click="handleConfirm"
            :disabled="selectedSet.size === 0"
            class="w-full bg-gymOrange text-white font-bold rounded-lg py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gymOrange/90 transition-colors"
          >
            Añadir {{ selectedSet.size > 0 ? selectedSet.size : '' }} bloque{{ selectedSet.size !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
