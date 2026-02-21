<script setup>
import { ref, watch, onMounted } from 'vue'
import { useScreenStore, slugify } from '../stores/screenStore'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { TvIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BottomSheet from '../components/BottomSheet.vue'

const screenStore = useScreenStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

// --- Bottom sheet ---
const sheetOpen = ref(false)

function openSheet() {
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
  newName.value = ''
  newId.value = ''
  idEdited.value = false
  createError.value = ''
}

// --- Create form ---
const newName = ref('')
const newId = ref('')
const idEdited = ref(false)
const creating = ref(false)
const createError = ref('')

watch(newName, (val) => {
  if (!idEdited.value) {
    newId.value = slugify(val)
  }
})

function onIdInput(e) {
  const cleaned = e.target.value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
  newId.value = cleaned
  idEdited.value = cleaned !== ''
}

async function handleCreate() {
  createError.value = ''
  if (!newName.value.trim()) return
  if (!newId.value.trim()) {
    createError.value = 'El identificador no puede estar vacío.'
    return
  }
  creating.value = true
  try {
    await screenStore.createScreen(newName.value.trim(), newId.value.trim())
    toastStore.show('Pantalla creada')
    closeSheet()
  } catch {
    createError.value = screenStore.error || 'No se pudo crear la pantalla.'
  } finally {
    creating.value = false
  }
}

// --- Inline edit ---
const editingScreenId = ref(null)
const editName = ref('')
const saving = ref(false)

function startEdit(screen) {
  editingScreenId.value = screen.id
  editName.value = screen.name
}

function cancelEdit() {
  editingScreenId.value = null
}

async function saveEdit() {
  if (!editName.value.trim()) return
  saving.value = true
  try {
    await screenStore.renameScreen(editingScreenId.value, editName.value.trim())
    editingScreenId.value = null
    toastStore.show('Nombre actualizado')
  } catch {
    // error shown via screenStore.error
  } finally {
    saving.value = false
  }
}

// --- Delete ---
async function handleDelete(screen) {
  const ok = await confirm({
    title: 'Eliminar pantalla',
    message: `"${screen.name}" será eliminada permanentemente.`,
  })
  if (ok) {
    await screenStore.deleteScreen(screen.id)
    toastStore.show('Pantalla eliminada')
  }
}

onMounted(() => {
  screenStore.fetchScreens()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gymOrange">Pantallas</h1>
      <button
        @click="openSheet"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
      >
        + Nueva pantalla
      </button>
    </div>

    <!-- Create bottom sheet -->
    <BottomSheet :open="sheetOpen" title="Nueva pantalla" @close="closeSheet">
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-white/60 mb-1">Nombre</label>
          <input
            v-model="newName"
            type="text"
            placeholder="Ej. Sala Funcional"
            autofocus
            @keyup.enter="handleCreate"
            class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gymOrange"
          />
        </div>

        <div>
          <label class="block text-xs text-white/60 mb-1">Identificador (URL)</label>
          <div class="flex items-center gap-2">
            <span class="text-white/50 text-sm shrink-0">/tv/</span>
            <input
              :value="newId"
              type="text"
              placeholder="sala-funcional"
              @input="onIdInput"
              @keyup.enter="handleCreate"
              class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gymOrange font-mono"
            />
          </div>
          <p class="text-white/50 text-xs mt-1">Se genera automáticamente desde el nombre. Puedes editarlo.</p>
        </div>

        <div v-if="createError" class="text-red-400 text-sm">
          {{ createError }}
        </div>

        <div class="flex gap-3 pt-1">
          <button
            @click="handleCreate"
            :disabled="creating || !newName.trim() || !newId.trim()"
            class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
          >
            {{ creating ? 'Creando...' : 'Crear pantalla' }}
          </button>
          <button
            @click="closeSheet"
            class="text-white/60 hover:text-white border border-white/20 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </BottomSheet>

    <!-- Loading -->
    <div v-if="screenStore.loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="screenStore.screens.length === 0"
      class="text-center py-12 text-white/60"
    >
      <TvIcon class="w-12 h-12 mx-auto mb-3 text-white/40" />
      <p>No hay pantallas todavía. Crea una pantalla por cada TV de tu gimnasio.</p>
    </div>

    <!-- Screens list -->
    <div v-else class="space-y-3">
      <div
        v-for="screen in screenStore.screens"
        :key="screen.id"
        class="bg-white/5 border border-white/10 rounded-lg p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Name + URL -->
          <div class="flex-1 min-w-0">
            <!-- View mode -->
            <div v-if="editingScreenId !== screen.id">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-white font-bold text-lg">{{ screen.name }}</span>
                <div v-if="screen.activeSessionId" class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span class="text-xs text-green-400 font-medium">En vivo</span>
                </div>
              </div>
              <span class="text-white/50 text-sm font-mono">/tv/{{ screen.id }}</span>
            </div>

            <!-- Edit mode -->
            <div v-else class="space-y-2">
              <input
                v-model="editName"
                type="text"
                autofocus
                class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gymOrange"
                @keyup.enter="saveEdit"
                @keyup.esc="cancelEdit"
              />
              <span class="block text-white/50 text-xs font-mono">/tv/{{ screen.id }}</span>
              <div v-if="screenStore.error" class="text-red-400 text-xs">
                {{ screenStore.error }}
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveEdit"
                  :disabled="saving || !editName.trim()"
                  class="bg-gymOrange text-white font-bold rounded-lg px-3 py-1.5 text-sm hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
                >
                  {{ saving ? 'Guardando...' : 'Guardar' }}
                </button>
                <button
                  @click="cancelEdit"
                  class="text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="editingScreenId !== screen.id"
              @click="startEdit(screen)"
              class="flex items-center gap-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              <PencilSquareIcon class="w-4 h-4" />
              Editar
            </button>
            <button
              @click="handleDelete(screen)"
              class="flex items-center gap-1.5 text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              <TrashIcon class="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
