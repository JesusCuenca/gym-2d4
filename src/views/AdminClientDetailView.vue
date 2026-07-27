<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useClientStore } from '../stores/clientStore'
import { useMeasurementStore } from '../stores/measurementStore'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { chartableMetrics } from '../utils/measurements'
import MeasurementFormSheet from '../components/clients/MeasurementFormSheet.vue'
import MeasurementsTable from '../components/clients/MeasurementsTable.vue'
import MetricChartPanel from '../components/clients/MetricChartPanel.vue'
import { PencilSquareIcon, LinkIcon, PlusIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  id: { type: String, required: true },
})

const clientStore = useClientStore()
const measurementStore = useMeasurementStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

const client = ref(null)
const loading = ref(true)
const sheetOpen = ref(false)
const editingMeasurement = ref(null)
const saving = ref(false)
const progressUrl = `${window.location.origin}/progreso/${props.id}`
const showUrlFallback = ref(false)

const isOwner = computed(() => client.value?.uid === authStore.user?.uid)

const infoLine = computed(() => {
  if (!client.value) return ''
  const parts = []
  const age = ageFromBirthDate(client.value.birthDate)
  if (age != null) parts.push(`${age} años`)
  if (client.value.heightCm) parts.push(`${client.value.heightCm} cm`)
  if (client.value.email) parts.push(client.value.email)
  if (client.value.phone) parts.push(client.value.phone)
  return parts.join(' · ')
})

// Charts only make sense with 2+ points for a chartable metric
const hasCharts = computed(() => chartableMetrics(measurementStore.measurements).length > 0)

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(progressUrl)
    toastStore.show('Enlace copiado')
  } catch {
    showUrlFallback.value = true
  }
}

function openCreate() {
  editingMeasurement.value = null
  sheetOpen.value = true
}

function openEdit(measurement) {
  editingMeasurement.value = measurement
  sheetOpen.value = true
}

async function handleSubmit(data) {
  saving.value = true
  try {
    if (editingMeasurement.value) {
      await measurementStore.updateMeasurement(props.id, editingMeasurement.value.id, data)
      toastStore.show('Medición actualizada')
    } else {
      await measurementStore.createMeasurement(props.id, data)
      toastStore.show('Medición guardada')
    }
    sheetOpen.value = false
  } catch {
    toastStore.show(measurementStore.error || 'Error al guardar la medición.', 'error')
  } finally {
    saving.value = false
  }
}

async function handleRemove(measurement) {
  const ok = await confirm({
    title: 'Eliminar medición',
    message: `La medición del ${measurement.measuredAt} será eliminada permanentemente.`,
  })
  if (!ok) return
  try {
    await measurementStore.deleteMeasurement(props.id, measurement.id)
    toastStore.show('Medición eliminada')
  } catch {
    toastStore.show('Error al eliminar la medición.', 'error')
  }
}

onMounted(async () => {
  loading.value = true
  const [clientResult] = await Promise.all([
    clientStore.getClient(props.id),
    measurementStore.fetchMeasurements(props.id),
  ])
  client.value = clientResult
  loading.value = false
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <!-- Not found -->
    <div v-else-if="!client" class="text-center py-12">
      <p class="text-white/60 mb-4">No se encontró el cliente.</p>
      <RouterLink :to="{ name: 'admin-clients' }" class="text-gymOrange text-sm hover:underline">
        Volver a clientes
      </RouterLink>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-2">
        <h1 class="text-2xl font-bold text-gymOrange">{{ client.name }}</h1>
        <RouterLink
          v-if="isOwner"
          :to="{ name: 'admin-client-edit', params: { id: props.id } }"
          class="flex items-center gap-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          <PencilSquareIcon class="w-4 h-4" />
          Editar
        </RouterLink>
      </div>

      <p v-if="infoLine" class="text-white/60 text-sm mb-4">{{ infoLine }}</p>

      <div v-if="client.dietaryNotes || client.notes" class="grid gap-3 sm:grid-cols-2 mb-6">
        <div v-if="client.dietaryNotes" class="bg-white/5 border border-white/10 rounded-lg p-3">
          <h3 class="text-white/50 text-xs uppercase tracking-wide mb-1">Notas alimenticias</h3>
          <p class="text-white/80 text-sm whitespace-pre-line">{{ client.dietaryNotes }}</p>
        </div>
        <div v-if="client.notes" class="bg-white/5 border border-white/10 rounded-lg p-3">
          <h3 class="text-white/50 text-xs uppercase tracking-wide mb-1">Notas</h3>
          <p class="text-white/80 text-sm whitespace-pre-line">{{ client.notes }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-3 mb-8">
        <button
          @click="openCreate"
          class="flex items-center gap-1.5 bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
        >
          <PlusIcon class="w-4 h-4" />
          Nueva medición
        </button>
        <button
          @click="copyLink"
          class="flex items-center gap-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg px-4 py-2 transition-colors"
        >
          <LinkIcon class="w-4 h-4" />
          Copiar enlace privado
        </button>
      </div>

      <div v-if="showUrlFallback" class="mb-8">
        <label class="block mb-1 text-sm text-white/70">Enlace privado del cliente</label>
        <input
          readonly
          :value="progressUrl"
          @focus="$event.target.select()"
          class="w-full bg-white/10 border border-white/20 rounded-lg text-white px-3 py-2 text-sm"
        />
      </div>

      <!-- Measurements -->
      <div v-if="measurementStore.measurements.length === 0" class="text-center py-12 bg-white/5 border border-white/10 rounded-lg">
        <p class="text-white/60">Todavía no hay mediciones. Añade la primera para empezar el seguimiento.</p>
      </div>

      <template v-else>
        <h2 class="text-lg font-bold text-white mb-3">Mediciones</h2>
        <MeasurementsTable
          :measurements="measurementStore.measurements"
          editable
          class="mb-8"
          @edit="openEdit"
          @remove="handleRemove"
        />

        <template v-if="hasCharts">
          <h2 class="text-lg font-bold text-white mb-3">Evolución</h2>
          <MetricChartPanel :measurements="measurementStore.measurements" />
        </template>
      </template>

      <MeasurementFormSheet
        :open="sheetOpen"
        :measurement="editingMeasurement"
        :saving="saving"
        @close="sheetOpen = false"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
