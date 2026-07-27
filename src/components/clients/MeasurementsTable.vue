<script setup>
import { computed } from 'vue'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { formatMetricValue } from '../../models/measurementMetrics'
import { getDelta, formatDelta, deltaTone, presentMetrics, TONE_CLASS } from '../../utils/measurements'

const props = defineProps({
  // Sorted by measuredAt ascending
  measurements: { type: Array, required: true },
  editable: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'remove'])

const columns = computed(() => presentMetrics(props.measurements))

// Rows render newest-first but deltas compare against the chronological
// (ascending) order, so each row keeps its original index.
const rows = computed(() =>
  props.measurements
    .map((measurement, index) => ({ measurement, index }))
    .reverse(),
)

function formatDate(measuredAt) {
  const [year, month, day] = measuredAt.split('-')
  return `${day}/${month}/${year.slice(2)}`
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-white/10">
    <table class="w-full text-sm whitespace-nowrap">
      <thead>
        <tr class="border-b border-white/10 text-left text-white/50">
          <th class="sticky left-0 bg-gymBlack px-3 py-2 font-medium">Fecha</th>
          <th v-for="metric in columns" :key="metric.key" class="px-3 py-2 font-medium">
            {{ metric.label }}
          </th>
          <th v-if="editable" class="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.measurement.id"
          class="border-b border-white/5 last:border-0"
        >
          <td class="sticky left-0 bg-gymBlack px-3 py-2 text-white/80 font-medium">
            {{ formatDate(row.measurement.measuredAt) }}
          </td>
          <td v-for="metric in columns" :key="metric.key" class="px-3 py-2">
            <span class="text-white">{{ formatMetricValue(metric.key, row.measurement[metric.key]) }}</span>
            <span
              v-if="getDelta(measurements, row.index, metric.key) != null"
              class="ml-1.5 text-xs"
              :class="TONE_CLASS[deltaTone(metric, getDelta(measurements, row.index, metric.key))]"
            >
              {{ formatDelta(metric.key, getDelta(measurements, row.index, metric.key)) }}
            </span>
          </td>
          <td v-if="editable" class="px-3 py-2">
            <div class="flex gap-2 justify-end">
              <button
                @click="emit('edit', row.measurement)"
                class="text-white/50 hover:text-white transition-colors p-1"
                title="Editar medición"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button
                @click="emit('remove', row.measurement)"
                class="text-red-400/60 hover:text-red-400 transition-colors p-1"
                title="Eliminar medición"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
