<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useClientStore } from '../stores/clientStore'
import { useMeasurementStore } from '../stores/measurementStore'
import { presentMetrics, chartableMetrics, latestValue, latestDelta, formatDelta, deltaTone, TONE_CLASS } from '../utils/measurements'
import { formatMetricValue } from '../models/measurementMetrics'
import MetricChartPanel from '../components/clients/MetricChartPanel.vue'
import MeasurementsTable from '../components/clients/MeasurementsTable.vue'

const route = useRoute()
const clientStore = useClientStore()
const measurementStore = useMeasurementStore()

const clientId = route.params.clientId
const client = ref(null)
const loading = ref(true)
const selectedMetricKey = ref(null)

const measurements = computed(() => measurementStore.measurements)

const summaryMetrics = computed(() => presentMetrics(measurements.value))

const chartableKeys = computed(() => new Set(chartableMetrics(measurements.value).map((m) => m.key)))

const lastMeasuredAt = computed(() => {
  const last = measurements.value[measurements.value.length - 1]
  return last ? formatDate(last.measuredAt) : null
})

function formatDate(measuredAt) {
  const [year, month, day] = measuredAt.split('-')
  return `${day}/${month}/${year}`
}

onMounted(async () => {
  loading.value = true
  const [clientResult] = await Promise.all([
    clientStore.getClient(clientId),
    measurementStore.fetchMeasurements(clientId),
  ])
  client.value = clientResult
  loading.value = false
})
</script>

<template>
  <div class="bg-gymBlack min-h-screen">
    <div v-if="loading" class="flex justify-center py-24">
      <AppSpinner size="lg" />
    </div>

    <!-- Invalid link: no hints about whether the ID exists -->
    <div v-else-if="!client" class="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <img src="/gym-2d4-logo.jpg" alt="2D4 Gym" class="h-16 w-16 object-contain rounded-xl mb-6" />
      <h1 class="font-condensed font-black uppercase text-3xl text-white mb-2">Enlace no válido</h1>
      <p class="text-white/50">Pide a tu entrenador un nuevo enlace de acceso.</p>
    </div>

    <div v-else class="max-w-5xl mx-auto px-4 py-8">
      <!-- Header (only the name — trainer-facing fields are never rendered here) -->
      <header class="flex items-center gap-3 mb-8">
        <img src="/gym-2d4-logo.jpg" alt="2D4 Gym" class="h-12 w-12 object-contain rounded-xl" />
        <div>
          <p class="text-gymOrange font-bold text-sm uppercase tracking-wide">2D4 Gym</p>
          <h1 class="font-condensed font-black uppercase text-3xl text-white leading-none">
            Hola, {{ client.name }}
          </h1>
        </div>
      </header>

      <div v-if="measurements.length === 0" class="text-center py-16 bg-white/5 border border-white/10 rounded-lg">
        <p class="text-white/60">Todavía no hay mediciones registradas.</p>
      </div>

      <template v-else>
        <!-- Latest measurement summary cards -->
        <h2 class="text-white/50 text-xs uppercase tracking-wide mb-3">Última medición</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          <component :is="chartableKeys.has(metric.key) ? 'button' : 'div'" v-for="metric in summaryMetrics"
            :key="metric.key" :type="chartableKeys.has(metric.key) ? 'button' : undefined"
            @click="chartableKeys.has(metric.key) && (selectedMetricKey = metric.key)"
            class="text-left w-full bg-white/5 border rounded-lg p-4 transition-colors" :class="selectedMetricKey === metric.key
                ? 'border-gymOrange/40'
                : 'border-white/10'
              ">
            <p class="text-white/50 text-xs mb-1">{{ metric.label }}</p>
            <p class="font-condensed font-black text-3xl text-gymOrange leading-none">
              {{ formatMetricValue(metric.key, latestValue(measurements, metric.key)) }}
            </p>
            <span v-if="latestDelta(measurements, metric.key) != null"
              class="inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded bg-white/5"
              :class="TONE_CLASS[deltaTone(metric, latestDelta(measurements, metric.key))]">
              {{ formatDelta(metric.key, latestDelta(measurements, metric.key)) }}
            </span>
          </component>
        </div>

        <!-- Charts -->
        <template v-if="chartableKeys.size">
          <h2 class="text-white/50 text-xs uppercase tracking-wide mb-3">Evolución</h2>
          <MetricChartPanel v-model="selectedMetricKey" :measurements="measurements" class="mb-10" />
        </template>

        <!-- History -->
        <h2 class="text-white/50 text-xs uppercase tracking-wide mb-3">Historial</h2>
        <MeasurementsTable :measurements="measurements" :editable="false" class="mb-6" />

        <p class="text-white/40 text-sm text-center pb-8">Última medición: {{ lastMeasuredAt }}</p>
      </template>
    </div>
  </div>
</template>
