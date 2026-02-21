<script setup>
import { ref, computed, watch } from 'vue'
import { BLOCK_TYPES, TIMED_SUBTYPES, REPS_SUBTYPES } from '../models/blockTypes'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  searchText: { type: String, default: '' },
  userMode: { type: String, default: 'mine' },
  selectedUserUids: { type: Array, default: () => [] },
  dateFrom: { type: String, default: '' },
  dateTo: { type: String, default: '' },
  typeFilter: { type: String, default: '' },
  subtypeFilter: { type: String, default: '' },
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  totalFilteredCount: { type: Number, default: 0 },
  showTypeFilter: { type: Boolean, default: false },
  allUsers: { type: Array, default: () => [] },
  currentUserUid: { type: String, default: '' },
  hasActiveFilters: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:searchText',
  'update:userMode',
  'update:selectedUserUids',
  'update:dateFrom',
  'update:dateTo',
  'update:typeFilter',
  'update:subtypeFilter',
  'nextPage',
  'prevPage',
  'clearFilters',
])

const sheetOpen = ref(false)

const subtypeOptions = computed(() => {
  if (props.typeFilter === 'timed') return TIMED_SUBTYPES
  if (props.typeFilter === 'reps') return REPS_SUBTYPES
  return []
})

watch(() => props.typeFilter, () => {
  emit('update:subtypeFilter', '')
})

const otherUsers = computed(() => {
  return props.allUsers.filter((u) => u.uid !== props.currentUserUid)
})

function toggleUserUid(uid) {
  const current = [...props.selectedUserUids]
  const idx = current.indexOf(uid)
  if (idx === -1) current.push(uid)
  else current.splice(idx, 1)
  emit('update:selectedUserUids', current)
}

const pageSize = 20
const showingFrom = computed(() => Math.min((props.currentPage - 1) * pageSize + 1, props.totalFilteredCount))
const showingTo = computed(() => Math.min(props.currentPage * pageSize, props.totalFilteredCount))

const chipBase = 'px-3 py-1.5 text-xs rounded-lg border transition-colors'
const chipActive = 'bg-gymOrange/20 text-gymOrange border-gymOrange/30'
const chipInactive = 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
</script>

<template>
  <div class="space-y-3 mb-6">
    <!-- Search + filter toggle -->
    <div class="flex gap-2">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <input
          :value="searchText"
          @input="emit('update:searchText', $event.target.value)"
          type="text"
          placeholder="Buscar por nombre..."
          class="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-8 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gymOrange"
        />
        <button
          v-if="searchText"
          @click="emit('update:searchText', '')"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
      <button
        @click="sheetOpen = true"
        class="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors shrink-0"
        :class="hasActiveFilters
          ? 'border-gymOrange/50 text-gymOrange bg-gymOrange/10'
          : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'"
      >
        <FunnelIcon class="w-4 h-4" />
        Filtros
      </button>
    </div>

    <!-- Results count + pagination -->
    <div v-if="totalFilteredCount > 0" class="flex items-center justify-between text-xs text-white/50">
      <span>Mostrando {{ showingFrom }}–{{ showingTo }} de {{ totalFilteredCount }}</span>
      <div v-if="totalPages > 1" class="flex items-center gap-2">
        <button
          @click="emit('prevPage')"
          :disabled="currentPage <= 1"
          class="p-1 disabled:opacity-40 hover:text-white transition-colors"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        <span class="text-white/70">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="emit('nextPage')"
          :disabled="currentPage >= totalPages"
          class="p-1 disabled:opacity-40 hover:text-white transition-colors"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Bottom sheet filter panel -->
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
        v-if="sheetOpen"
        class="fixed inset-0 z-40 bg-black/60"
        @click="sheetOpen = false"
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
        v-if="sheetOpen"
        class="fixed bottom-0 inset-x-0 z-40 flex flex-col max-h-[70vh] max-w-lg mx-auto w-full bg-[#111111] rounded-t-2xl shadow-2xl"
      >
        <!-- Drag handle -->
        <div class="flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-2 pb-3 border-b border-white/10 shrink-0">
          <h2 class="text-white font-bold text-base">Filtros</h2>
          <button @click="sheetOpen = false" class="text-white/60 hover:text-white transition-colors p-1">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable filter content -->
        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
          <!-- User filter -->
          <div>
            <label class="block text-xs text-white/60 mb-2">Creado por</label>
            <div class="flex flex-wrap gap-2">
              <button
                @click="emit('update:userMode', 'mine')"
                :class="[chipBase, userMode === 'mine' ? chipActive : chipInactive]"
              >Solo los míos</button>
              <button
                @click="emit('update:userMode', 'all')"
                :class="[chipBase, userMode === 'all' ? chipActive : chipInactive]"
              >Todos</button>
              <button
                v-if="otherUsers.length > 0"
                @click="emit('update:userMode', 'selected')"
                :class="[chipBase, userMode === 'selected' ? chipActive : chipInactive]"
              >Seleccionar</button>
            </div>

            <!-- User multi-select pills -->
            <div v-if="userMode === 'selected' && otherUsers.length > 0" class="flex flex-wrap gap-2 mt-3">
              <button
                v-for="user in otherUsers"
                :key="user.uid"
                @click="toggleUserUid(user.uid)"
                :class="[chipBase, selectedUserUids.includes(user.uid)
                  ? 'bg-white/20 text-white border-white/40'
                  : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30']"
              >{{ user.displayName || user.email }}</button>
            </div>
          </div>

          <!-- Type + Subtype (blocks only) -->
          <div v-if="showTypeFilter">
            <label class="block text-xs text-white/60 mb-2">Tipo</label>
            <div class="flex flex-wrap gap-2">
              <button
                @click="emit('update:typeFilter', '')"
                :class="[chipBase, !typeFilter ? chipActive : chipInactive]"
              >Todos</button>
              <button
                v-for="bt in BLOCK_TYPES"
                :key="bt.value"
                @click="emit('update:typeFilter', bt.value)"
                :class="[chipBase, typeFilter === bt.value ? chipActive : chipInactive]"
              >{{ bt.label }}</button>
            </div>

            <!-- Subtype -->
            <div v-if="subtypeOptions.length > 0" class="mt-3">
              <label class="block text-xs text-white/60 mb-2">Subtipo</label>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="emit('update:subtypeFilter', '')"
                  :class="[chipBase, !subtypeFilter ? chipActive : chipInactive]"
                >Todos</button>
                <button
                  v-for="st in subtypeOptions"
                  :key="st.value"
                  @click="emit('update:subtypeFilter', st.value)"
                  :class="[chipBase, subtypeFilter === st.value ? chipActive : chipInactive]"
                >{{ st.label }}</button>
              </div>
            </div>
          </div>

          <!-- Date range -->
          <div>
            <label class="block text-xs text-white/60 mb-2">Fecha de creación</label>
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-xs text-white/50 mb-1">Desde</label>
                <div class="relative">
                  <input
                    :value="dateFrom"
                    @input="emit('update:dateFrom', $event.target.value)"
                    type="date"
                    class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-gymOrange [color-scheme:dark]"
                  />
                  <button
                    v-if="dateFrom"
                    @click="emit('update:dateFrom', '')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div class="flex-1">
                <label class="block text-xs text-white/50 mb-1">Hasta</label>
                <div class="relative">
                  <input
                    :value="dateTo"
                    @input="emit('update:dateTo', $event.target.value)"
                    type="date"
                    class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-gymOrange [color-scheme:dark]"
                  />
                  <button
                    v-if="dateTo"
                    @click="emit('update:dateTo', '')"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Clear filters -->
          <button
            v-if="hasActiveFilters"
            @click="emit('clearFilters')"
            class="text-gymOrange text-xs hover:underline"
          >Limpiar todos los filtros</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
