<script setup>
import { ref, computed, watch } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import { useExercisePicker } from '../composables/useExercisePicker'
import { parentGroups, exercises, filterExercises, muscleIdToName } from '../utils/exerciseIndex'

const { state, respond, cancel } = useExercisePicker()

const searchQuery = ref('')
const selectedParentId = ref(null)
const selectedChildId = ref(null)
const selectedSet = ref(new Set())

watch(
  () => state.value.open,
  (open) => {
    if (open) {
      searchQuery.value = ''
      selectedParentId.value = null
      selectedChildId.value = null
      selectedSet.value = new Set()
    }
  },
)

const activeParentGroup = computed(() =>
  selectedParentId.value
    ? parentGroups.find((g) => g.id === selectedParentId.value)
    : null,
)

const filteredExercises = computed(() =>
  filterExercises(searchQuery.value, selectedParentId.value, selectedChildId.value),
)

function toggleParent(id) {
  if (selectedParentId.value === id) {
    selectedParentId.value = null
    selectedChildId.value = null
  } else {
    selectedParentId.value = id
    selectedChildId.value = null
  }
}

function toggleChild(id) {
  selectedChildId.value = selectedChildId.value === id ? null : id
}

function toggleExercise(ex) {
  const next = new Set(selectedSet.value)
  if (next.has(ex.displayName)) {
    next.delete(ex.displayName)
  } else {
    next.add(ex.displayName)
  }
  selectedSet.value = next
}

function handleConfirm() {
  const picked = exercises.filter((ex) => selectedSet.value.has(ex.displayName))
  respond(picked)
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
          <h2 class="text-white font-bold text-base">Añadir ejercicios</h2>
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
              placeholder="Buscar ejercicio..."
              class="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gymOrange"
            />
          </div>
        </div>

        <!-- Parent chips -->
        <div class="px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          <div class="flex gap-2 min-w-max">
            <button
              v-for="group in parentGroups"
              :key="group.id"
              type="button"
              @click="toggleParent(group.id)"
              class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
              :class="
                selectedParentId === group.id
                  ? 'bg-gymOrange text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              "
            >
              {{ group.name }}
            </button>
          </div>
        </div>

        <!-- Child chips -->
        <div
          v-if="activeParentGroup && activeParentGroup.children.length"
          class="px-4 pb-3 overflow-x-auto scrollbar-hide flex-shrink-0"
        >
          <div class="flex gap-2 min-w-max">
            <button
              v-for="child in activeParentGroup.children"
              :key="child.id"
              type="button"
              @click="toggleChild(child.id)"
              class="px-3 py-1 rounded-full text-xs transition-colors whitespace-nowrap"
              :class="
                selectedChildId === child.id
                  ? 'bg-gymOrange/80 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/15'
              "
            >
              {{ child.name }}
            </button>
          </div>
        </div>

        <!-- Exercise list -->
        <div class="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          <div v-if="filteredExercises.length === 0" class="text-center text-white/50 text-sm py-10">
            No hay ejercicios con ese filtro.
          </div>
          <div
            v-for="ex in filteredExercises"
            :key="ex.displayName"
            @click="toggleExercise(ex)"
            class="flex items-center gap-3 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 -mx-4 px-4 transition-colors"
          >
            <!-- Checkbox -->
            <div
              class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors"
              :class="
                selectedSet.has(ex.displayName)
                  ? 'bg-gymOrange border-gymOrange'
                  : 'border-white/30 bg-transparent'
              "
            >
              <svg
                v-if="selectedSet.has(ex.displayName)"
                class="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <!-- Name + muscles -->
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">{{ ex.name }}</p>
              <p class="text-white/50 text-xs mt-0.5 truncate">
                {{ muscleIdToName[ex.musculoPrincipal] ?? ex.musculoPrincipal }}
                <span v-if="ex.musculosSecundarios && ex.musculosSecundarios.length">
                  · {{ ex.musculosSecundarios.map((id) => muscleIdToName[id] ?? id).join(' · ') }}
                </span>
              </p>
            </div>

            <!-- Display name -->
            <span class="text-gymOrange text-xs font-bold flex-shrink-0">{{ ex.displayName }}</span>
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
            Añadir {{ selectedSet.size > 0 ? selectedSet.size : '' }} ejercicio{{ selectedSet.size !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
