<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useBlockStore } from '../stores/blockStore'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/auth'
import { BLOCK_TYPES, TIMED_SUBTYPES, isTimed } from '../models/blockTypes'
import { validateBlock } from '../utils/validation'
import { Bars2Icon, XMarkIcon } from '@heroicons/vue/20/solid'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'
import { useBlockPicker } from '../composables/useBlockPicker'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'
import { createEmptyForm, blockDataToForm, formToBlockData } from '../utils/blockForm'
import BlockFormEditor from '../components/BlockFormEditor.vue'
import TagSelector from '../components/TagSelector.vue'
import { CLASS_TAG_GROUPS } from '../utils/tags'
import draggable from 'vuedraggable'

const router = useRouter()
const route = useRoute()
const classStore = useClassStore()
const blockStore = useBlockStore()
const toastStore = useToastStore()
const authStore = useAuthStore()

let blockKeyCounter = 0

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')
const name = ref('')
const description = ref('')
const classTags = ref([])
const classBlocks = ref([]) // { _key, sourceBlockId, form, editing }
const classOwnerUid = ref(null)

const isReadOnly = computed(
  () => isEditMode.value && classOwnerUid.value !== null && classOwnerUid.value !== authStore.user?.uid
)

const { isDirty, markClean, takeSnapshot } = useUnsavedChanges(() => ({
  name: name.value,
  description: description.value,
  classTags: classTags.value,
  classBlocks: classBlocks.value,
}))

const { pickBlocks } = useBlockPicker()

// --- Summary text for collapsed block header ---

function blockSummary(form) {
  const parts = []
  const exCount = form.exercises?.filter((e) => e.name).length || 0
  if (exCount) parts.push(`${exCount} ejercicio${exCount !== 1 ? 's' : ''}`)
  if (isTimed(form.type)) {
    const work = parseInt(form.workMinutes || 0) * 60 + parseInt(form.workSeconds || 0)
    if (work) {
      const m = Math.floor(work / 60)
      const s = work % 60
      parts.push(s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`)
    }
  }
  if (form.rounds) parts.push(`${form.rounds} rondas`)
  if (form.subtype === 'perRound' && Array.isArray(form.repsPerRound)) {
    const nums = form.repsPerRound.filter((s) => s)
    if (nums.length) parts.push(nums.join('-'))
  }
  return parts.join(' · ')
}

// --- Block management ---

async function openBlockPicker() {
  const picked = await pickBlocks()
  if (!picked.length) return
  for (const block of picked) {
    classBlocks.value.push({
      _key: ++blockKeyCounter,
      sourceBlockId: block.id,
      form: blockDataToForm(block),
      editing: false,
    })
  }
}

function addNewBlock() {
  classBlocks.value.push({
    _key: ++blockKeyCounter,
    sourceBlockId: null,
    form: createEmptyForm(),
    editing: true,
  })
}

function removeBlock(index) {
  classBlocks.value.splice(index, 1)
}

function toggleEdit(index) {
  classBlocks.value[index].editing = !classBlocks.value[index].editing
}

// --- Save block inline to library ---

async function saveToLibrary(blockIndex) {
  try {
    const blockData = formToBlockData(classBlocks.value[blockIndex].form)
    const blockId = await blockStore.createBlock(blockData)
    classBlocks.value[blockIndex].sourceBlockId = blockId
    await blockStore.fetchBlocks()
    toastStore.show('Bloque guardado en el catálogo')
  } catch {
    toastStore.show('Error al guardar el bloque en el catálogo.', 'error')
  }
}

// --- Submit ---

async function handleSubmit() {
  validationError.value = ''
  if (classBlocks.value.length === 0) {
    validationError.value = 'Añade al menos un bloque a la clase.'
    return
  }
  const invalidBlock = classBlocks.value.find((cb) => !cb.form.name.trim())
  if (invalidBlock) {
    validationError.value = 'Todos los bloques deben tener un nombre.'
    return
  }
  const blockWithNoExercises = classBlocks.value.find(
    (cb) => !cb.form.exercises.some((ex) => ex.name.trim())
  )
  if (blockWithNoExercises) {
    validationError.value = `El bloque "${blockWithNoExercises.form.name || 'Sin nombre'}" necesita al menos un ejercicio.`
    return
  }

  for (const cb of classBlocks.value) {
    const blockData = formToBlockData(cb.form)
    const result = validateBlock(blockData)
    if (!result.valid) {
      validationError.value = `Bloque "${cb.form.name || 'Sin nombre'}": ${result.message}`
      return
    }
  }

  submitting.value = true
  try {
    const classData = {
      name: name.value,
      description: description.value || null,
      tags: classTags.value.length ? [...classTags.value] : [],
      blocks: classBlocks.value.map((cb, index) => ({
        blockId: cb.sourceBlockId || null,
        blockData: formToBlockData(cb.form),
        order: index,
      })),
    }

    if (isEditMode.value) {
      await classStore.updateClass(route.params.id, classData)
    } else {
      await classStore.createClass(classData)
    }

    markClean()
    router.push({ name: 'admin-classes' })
  } catch {
    toastStore.show('Error al guardar la clase. Intenta de nuevo.', 'error')
  } finally {
    submitting.value = false
  }
}

// --- Load ---

onMounted(async () => {
  loading.value = true
  await blockStore.fetchBlocks()
  if (isEditMode.value) {
    const cls = await classStore.getClassById(route.params.id)
    if (cls) {
      classOwnerUid.value = cls.uid ?? null
      name.value = cls.name
      description.value = cls.description || ''
      classTags.value = cls.tags || []
      classBlocks.value = (cls.blocks || []).map((b) => ({
        _key: ++blockKeyCounter,
        sourceBlockId: b.blockId,
        form: blockDataToForm(b.blockData),
        editing: false,
      }))
    }
  }
  loading.value = false
  await nextTick()
  takeSnapshot()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isReadOnly ? 'Ver clase' : isEditMode ? 'Editar clase' : 'Crear clase' }}
      <span v-if="isDirty && !isReadOnly" class="inline-block w-2 h-2 bg-gymOrange rounded-full ml-2 align-middle" title="Cambios sin guardar" />
    </h1>

    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Read-only banner -->
      <div v-if="isReadOnly" class="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-sm text-white/60">
        Esta clase pertenece a otro entrenador. Solo puedes verla.
      </div>

      <!-- Class Name -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Nombre de la clase</label>
        <input
          v-model="name"
          type="text"
          :required="!isReadOnly"
          :disabled="isReadOnly"
          placeholder="Ej. WOD Lunes"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gymOrange disabled:opacity-60 disabled:cursor-default"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm text-white/70 mb-1">Descripción (opcional)</label>
        <textarea
          v-model="description"
          rows="2"
          :disabled="isReadOnly"
          placeholder="Breve descripción de la clase"
          class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gymOrange resize-none disabled:opacity-60 disabled:cursor-default"
        />
      </div>

      <!-- Class Tags -->
      <div>
        <label class="block text-sm text-white/70 mb-1.5">Etiquetas</label>
        <TagSelector
          :tagGroups="CLASS_TAG_GROUPS"
          v-model="classTags"
          :readonly="isReadOnly"
        />
      </div>

      <!-- Class Blocks -->
      <div>
        <label class="block text-sm text-white/70 mb-3">
          Bloques de la clase ({{ classBlocks.length }})
        </label>

        <div
          v-if="classBlocks.length === 0"
          class="text-white/50 text-sm py-4 text-center border border-dashed border-white/10 rounded-lg"
        >
          Aún no hay bloques. Añade bloques del catálogo o crea uno nuevo.
        </div>

        <draggable
          v-else
          v-model="classBlocks"
          item-key="_key"
          handle=".block-drag-handle"
          ghost-class="opacity-30"
          :animation="200"
          :disabled="isReadOnly"
          class="space-y-3 mb-4"
        >
          <template #item="{ element: cb, index: bIndex }">
            <div class="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <!-- Block header (always visible) -->
              <div class="flex items-center gap-3 px-4 py-3">
                <Bars2Icon v-if="!isReadOnly" class="block-drag-handle w-5 h-5 text-white/50 hover:text-white/60 cursor-grab active:cursor-grabbing shrink-0" />
                <span class="text-gymOrange font-bold text-sm w-6">{{ bIndex + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-white font-medium text-sm truncate block">
                    {{ cb.form.name || 'Sin nombre' }}
                  </span>
                  <span class="text-white/50 text-xs">
                    {{ cb.form.subtype && cb.form.subtype !== 'custom' ? TIMED_SUBTYPES.find(p => p.value === cb.form.subtype)?.label : BLOCK_TYPES.find(bt => bt.value === cb.form.type)?.label }}
                    <span v-if="blockSummary(cb.form)"> · {{ blockSummary(cb.form) }}</span>
                  </span>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <button type="button" @click="toggleEdit(bIndex)"
                    class="text-gymOrange/70 hover:text-gymOrange p-1" :title="isReadOnly ? 'Ver detalles' : 'Editar'">
                    <PencilSquareIcon class="w-4 h-4" />
                  </button>
                  <button v-if="!isReadOnly" type="button" @click="removeBlock(bIndex)"
                    class="text-red-400/70 hover:text-red-400 p-1 ml-1"><XMarkIcon class="w-4 h-4" /></button>
                </div>
              </div>

              <!-- Inline block viewer/editor (collapsible) -->
              <div v-if="cb.editing" class="border-t border-white/10 px-4 py-4 bg-white/[0.02]">
                <BlockFormEditor :form="cb.form" compact :readonly="isReadOnly" />

                <!-- Save to library (only when not readonly) -->
                <div v-if="!isReadOnly" class="pt-3 mt-3 border-t border-white/10">
                  <button
                    v-if="!cb.sourceBlockId"
                    type="button"
                    @click="saveToLibrary(bIndex)"
                    class="text-xs text-gymOrange/70 hover:text-gymOrange transition-colors"
                  >
                    Guardar en el catálogo de bloques
                  </button>
                  <span v-else class="text-xs text-white/50">
                    Basado en bloque del catálogo (los cambios solo afectan a esta clase)
                  </span>
                </div>

                <!-- Close -->
                <button
                  type="button"
                  @click="toggleEdit(bIndex)"
                  class="w-full text-center text-xs text-white/50 hover:text-white/70 py-1 mt-1 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- Add block actions (only when not readonly) -->
      <div v-if="!isReadOnly" class="flex gap-2">
        <button
          type="button"
          @click="openBlockPicker"
          class="flex-1 border border-dashed border-white/20 rounded-lg py-3 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          + Añadir del catálogo
        </button>
        <button
          type="button"
          @click="addNewBlock"
          class="flex-1 border border-dashed border-gymOrange/30 rounded-lg py-3 text-gymOrange/70 hover:text-gymOrange hover:border-gymOrange/50 text-sm transition-colors"
        >
          + Crear bloque nuevo
        </button>
      </div>

      <!-- Validation error -->
      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <!-- Submit / Back -->
      <div class="flex gap-3 pt-4">
        <button
          v-if="!isReadOnly"
          type="submit"
          :disabled="submitting || classBlocks.length === 0"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Guardando...' : isEditMode ? 'Actualizar clase' : 'Crear clase' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-classes' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
          :class="{ 'flex-1': isReadOnly }"
        >
          {{ isReadOnly ? 'Volver' : 'Cancelar' }}
        </button>
      </div>
    </form>
  </div>
</template>
