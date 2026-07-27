<script setup>
import { ref, computed } from 'vue'
import { formatMetricValue } from '../../models/measurementMetrics'
import {
  chartableMetrics,
  latestValue,
  latestDelta,
  formatDelta,
  deltaTone,
  TONE_CLASS,
  filterByMonths,
  spansMoreThanMonths,
} from '../../utils/measurements'
import MetricChart from './MetricChart.vue'

const RANGE_OPTIONS = [
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '1 año' },
  { months: null, label: 'Todo' },
]

const props = defineProps({
  // Sorted by measuredAt ascending
  measurements: { type: Array, required: true },
})

// Controlled when the parent passes v-model, otherwise kept internally
// (e.g. the admin view just wants an in-place selector with no external state).
const selectedKey = defineModel({ default: null })

const metrics = computed(() => chartableMetrics(props.measurements))

const activeKey = computed(() => {
  if (metrics.value.some((m) => m.key === selectedKey.value)) return selectedKey.value
  return metrics.value[0]?.key ?? null
})

const activeMetric = computed(() => metrics.value.find((m) => m.key === activeKey.value) ?? null)

const activeDelta = computed(() =>
  activeMetric.value ? latestDelta(props.measurements, activeMetric.value.key) : null,
)

function selectMetric(key) {
  selectedKey.value = key
}

// Range selector — only offer windows shorter than the actual history, plus "Todo".
const selectedRange = ref(6)

const visibleRanges = computed(() =>
  RANGE_OPTIONS.filter(
    (option) => option.months == null || spansMoreThanMonths(props.measurements, option.months),
  ),
)

const activeRange = computed(() => {
  if (visibleRanges.value.some((option) => option.months === selectedRange.value)) {
    return selectedRange.value
  }
  return null
})

function selectRange(months) {
  selectedRange.value = months
}

const rangedMeasurements = computed(() => filterByMonths(props.measurements, activeRange.value))

// Whether the active metric still has enough points once the range is applied.
const hasDataInRange = computed(() =>
  activeMetric.value
    ? chartableMetrics(rangedMeasurements.value).some((m) => m.key === activeMetric.value.key)
    : false,
)
</script>

<template>
  <div v-if="metrics.length">
    <!-- Metric chips -->
    <div class="overflow-x-auto scrollbar-hide mb-3">
      <div class="flex gap-2 min-w-max">
        <button
          v-for="metric in metrics"
          :key="metric.key"
          type="button"
          @click="selectMetric(metric.key)"
          class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
          :class="
            activeKey === metric.key
              ? 'bg-gymOrange text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          "
        >
          {{ metric.label }}
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div v-if="activeMetric" class="bg-white/5 border border-white/10 rounded-lg p-4">
      <div class="flex items-baseline justify-between mb-2">
        <h3 class="text-white/70 text-sm font-semibold">
          {{ activeMetric.label }}<span v-if="activeMetric.unit" class="text-white/40"> ({{ activeMetric.unit }})</span>
        </h3>
        <div class="flex items-baseline gap-1.5">
          <span class="text-white font-condensed font-black text-xl">
            {{ formatMetricValue(activeMetric.key, latestValue(measurements, activeMetric.key)) }}
          </span>
          <span
            v-if="activeDelta != null"
            class="text-xs px-1.5 py-0.5 rounded bg-white/5"
            :class="TONE_CLASS[deltaTone(activeMetric, activeDelta)]"
          >
            {{ formatDelta(activeMetric.key, activeDelta) }}
          </span>
        </div>
      </div>

      <!-- Range chips -->
      <div v-if="visibleRanges.length > 1" class="flex justify-end gap-2 mb-3">
        <button
          v-for="option in visibleRanges"
          :key="option.label"
          type="button"
          @click="selectRange(option.months)"
          class="px-3 py-1.5 text-xs rounded-lg border transition-colors"
          :class="
            activeRange === option.months
              ? 'bg-gymOrange/20 text-gymOrange border-gymOrange/30'
              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
          "
        >
          {{ option.label }}
        </button>
      </div>

      <p v-if="!hasDataInRange" class="text-white/40 text-sm text-center py-10">
        Sin datos suficientes en este rango
      </p>
      <MetricChart v-else :metric="activeMetric" :measurements="rangedMeasurements" />
    </div>
  </div>
</template>
