<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClientStore } from '../stores/clientStore'
import { useToastStore } from '../stores/toastStore'
import { validateClient, CHAR_LIMITS } from '../utils/validation'
import { createEmptyClientForm, clientToForm, formToClientData } from '../utils/clientForm'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'

const router = useRouter()
const route = useRoute()
const clientStore = useClientStore()
const toastStore = useToastStore()

const isEditMode = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const validationError = ref('')

const form = ref(createEmptyClientForm())

const { isDirty, markClean, takeSnapshot } = useUnsavedChanges(() => form.value)

const inputClass =
  'w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange px-3 py-2'
const labelClass = 'block mb-1 text-sm text-white/70'

async function handleSubmit() {
  validationError.value = ''
  const clientData = formToClientData(form.value)
  const result = validateClient(clientData)
  if (!result.valid) {
    validationError.value = result.message
    return
  }

  submitting.value = true
  try {
    let clientId = route.params.id
    if (isEditMode.value) {
      await clientStore.updateClient(clientId, clientData)
      toastStore.show('Cliente actualizado')
    } else {
      clientId = await clientStore.createClient(clientData)
      toastStore.show('Cliente creado')
    }
    markClean()
    router.push({ name: 'admin-client-detail', params: { id: clientId } })
  } catch {
    toastStore.show(clientStore.error || 'Error al guardar el cliente.', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (isEditMode.value) {
    loading.value = true
    const client = await clientStore.getClient(route.params.id)
    loading.value = false
    if (client) {
      form.value = clientToForm(client)
    }
  }
  await nextTick()
  takeSnapshot()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gymOrange mb-6">
      {{ isEditMode ? 'Editar cliente' : 'Nuevo cliente' }}
      <span v-if="isDirty" class="inline-block w-2 h-2 bg-gymOrange rounded-full ml-2 align-middle" title="Cambios sin guardar" />
    </h1>

    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label :class="labelClass">Nombre *</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="Ej. María García"
          :maxlength="CHAR_LIMITS.clientName"
          :class="inputClass"
        />
        <span class="block text-xs text-white/40 text-right mt-0.5">{{ form.name.length }}/{{ CHAR_LIMITS.clientName }}</span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass">Email</label>
          <input v-model="form.email" type="email" placeholder="cliente@email.com" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass">Teléfono</label>
          <input v-model="form.phone" type="tel" placeholder="600 000 000" :class="inputClass" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass">Fecha de nacimiento</label>
          <input v-model="form.birthDate" type="date" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass">Altura (cm)</label>
          <input v-model="form.heightCm" type="number" min="50" max="250" placeholder="Ej. 170" :class="inputClass" />
        </div>
      </div>

      <div>
        <label :class="labelClass">Notas alimenticias</label>
        <textarea
          v-model="form.dietaryNotes"
          rows="3"
          placeholder="Intolerancias, alergias, preferencias…"
          :maxlength="CHAR_LIMITS.clientNotes"
          :class="inputClass"
        />
      </div>

      <div>
        <label :class="labelClass">Notas</label>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Objetivos, lesiones, observaciones…"
          :maxlength="CHAR_LIMITS.clientNotes"
          :class="inputClass"
        />
      </div>

      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <div class="flex gap-3 pt-4">
        <button
          type="submit"
          :disabled="submitting"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Guardando...' : isEditMode ? 'Actualizar cliente' : 'Crear cliente' }}
        </button>
        <button
          type="button"
          @click="router.push({ name: 'admin-clients' })"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
