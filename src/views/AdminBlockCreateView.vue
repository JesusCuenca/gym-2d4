<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlockStore } from '../stores/blockStore'
import { useAuthStore } from '../stores/auth'
import { validateBlock } from '../utils/validation'
import { createEmptyForm, blockDataToForm, formToBlockData } from '../utils/blockForm'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'
import BlockFormEditor from '../components/BlockFormEditor.vue'

const router = useRouter()
const route = useRoute()
const blockStore = useBlockStore()
const authStore = useAuthStore()

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')
const blockOwnerUid = ref(null)

const isReadOnly = computed(
  () => isEditMode.value && blockOwnerUid.value !== null && blockOwnerUid.value !== authStore.user?.uid
)

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
      blockOwnerUid.value = block.uid ?? null
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
      {{ isReadOnly ? 'Ver bloque' : isEditMode ? 'Editar bloque' : 'Crear bloque' }}
      <span v-if="isDirty && !isReadOnly" class="inline-block w-2 h-2 bg-gymOrange rounded-full ml-2 align-middle" title="Cambios sin guardar" />
    </h1>

    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <div v-else>
      <!-- Read-only banner -->
      <div v-if="isReadOnly" class="bg-white/5 border border-white/20 rounded-lg px-4 py-3 mb-6 text-sm text-white/60">
        Este bloque pertenece a otro entrenador. Solo puedes verlo.
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <BlockFormEditor :form="form" :readonly="isReadOnly" />

        <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

        <div class="flex gap-3 pt-4">
          <button
            v-if="!isReadOnly"
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
            :class="{ 'flex-1': isReadOnly }"
          >
            {{ isReadOnly ? 'Volver' : 'Cancelar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
