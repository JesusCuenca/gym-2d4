<script setup>
import { ref, watch } from 'vue'
import BottomSheet from '../BottomSheet.vue'
import { METRIC_GROUPS, MEASUREMENT_METRICS } from '../../models/measurementMetrics'
import { validateMeasurement, CHAR_LIMITS } from '../../utils/validation'
import {
  createEmptyMeasurementForm,
  measurementToForm,
  formToMeasurementData,
} from '../../utils/measurementForm'

const props = defineProps({
  open: Boolean,
  // null = create, object = edit
  measurement: { type: Object, default: null },
  saving: Boolean,
})

const emit = defineEmits(['close', 'submit'])

const form = ref(createEmptyMeasurementForm())
const validationError = ref('')

watch(
  () => [props.open, props.measurement],
  () => {
    if (props.open) {
      form.value = props.measurement
        ? measurementToForm(props.measurement)
        : createEmptyMeasurementForm()
      validationError.value = ''
    }
  },
)

function metricsOfGroup(groupKey) {
  return MEASUREMENT_METRICS.filter((m) => m.group === groupKey)
}

function handleSubmit() {
  validationError.value = ''
  const data = formToMeasurementData(form.value)
  const result = validateMeasurement(data)
  if (!result.valid) {
    validationError.value = result.message
    return
  }
  emit('submit', data)
}

const inputClass =
  'w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gymOrange px-3 py-2'
const labelClass = 'block mb-1 text-sm text-white/70'
</script>

<template>
  <BottomSheet :open="open" :title="measurement ? 'Editar medición' : 'Nueva medición'" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="sm:max-w-xs">
        <label :class="labelClass">Fecha</label>
        <input v-model="form.measuredAt" type="date" :class="inputClass" />
      </div>

      <div v-for="group in METRIC_GROUPS" :key="group.key">
        <h3 class="text-gymOrange font-bold text-sm uppercase tracking-wide mb-3">{{ group.label }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-for="metric in metricsOfGroup(group.key)" :key="metric.key">
            <label :class="labelClass">
              {{ metric.label }}<span v-if="metric.unit" class="text-white/40"> ({{ metric.unit }})</span>
            </label>
            <input
              v-model="form[metric.key]"
              type="text"
              inputmode="decimal"
              :placeholder="metric.integer ? 'Ej. 5' : 'Ej. 70,5'"
              :class="inputClass"
            />
          </div>
        </div>
      </div>

      <div>
        <label :class="labelClass">Notas</label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Opcional"
          :maxlength="CHAR_LIMITS.measurementNotes"
          :class="inputClass"
        />
      </div>

      <p v-if="validationError" class="text-red-400 text-sm">{{ validationError }}</p>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="saving"
          class="flex-1 bg-gymOrange text-white font-bold rounded-lg px-4 py-3 hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
        >
          {{ saving ? 'Guardando...' : measurement ? 'Actualizar medición' : 'Guardar medición' }}
        </button>
        <button
          type="button"
          @click="emit('close')"
          class="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  </BottomSheet>
</template>
