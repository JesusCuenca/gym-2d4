<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { validateBlock } from '../utils/validation'
import { createEmptyForm, blockDataToForm, formToBlockData } from '../utils/blockForm'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'
import BlockFormEditor from '../components/BlockFormEditor.vue'

const router = useRouter()
const route = useRoute()
const blockStore = useBlockStore()

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')

const form = ref(createEmptyForm())

const { isDirty, markClean, takeSnapshot } = useUnsavedChanges(() => form.value)

async function handleSubmit() {
  validationError.value = ''
  const blockData = formToBlockData(form.value)
  const result = validateBlock(blockData)
  if (!result.valid) {
    validationError.value = result.message
    return
  }

  submitting.value = true
  try {
    if (isEditMode.value) {
      await blockStore.updateBlock(route.params.id, blockData)
    } else {
      await blockStore.createBlock(blockData)
    }
    markClean()
    router.push({ name: 'admin-blocks' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (isEditMode.value) {
    loading.value = true
    const block = await blockStore.getBlock(route.params.id)
    loading.value = false
    if (block) {
      form.value = blockDataToForm(block)
    }
  }
  await nextTick()
  takeSnapshot()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar bloque' : 'Crear bloque' }}
      <span v-if="isDirty" class="inline-block w-2 h-2 bg-gymOrange rounded-full ml-2 align-middle" title="Cambios sin guardar" />
    </h1>

    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <BlockFormEditor :form="form" />

      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          :disabled="submitting"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Guardando...' : isEditMode ? 'Actualizar bloque' : 'Crear bloque' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-blocks' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
