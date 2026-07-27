<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
// chart.js modules are registered only here so the library stays out of
// the TV and admin-core chunks (this component is lazy-loaded).
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js'
import { formatMetricValue } from '../../models/measurementMetrics'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

const props = defineProps({
  metric: { type: Object, required: true },
  // Sorted by measuredAt ascending
  measurements: { type: Array, required: true },
})

function formatDateLabel(measuredAt) {
  const [year, month, day] = measuredAt.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

// Hide individual point markers once there are too many to render cleanly,
// but keep a generous hit radius so the tooltip still works on hover/tap.
const pointRadius = computed(() => (props.measurements.length > 25 ? 0 : 4))

const chartData = computed(() => ({
  labels: props.measurements.map((m) => formatDateLabel(m.measuredAt)),
  datasets: [
    {
      data: props.measurements.map((m) => m[props.metric.key]),
      borderColor: '#FB6537',
      pointBackgroundColor: '#FB6537',
      pointRadius: pointRadius.value,
      pointHitRadius: 12,
      borderWidth: 2,
      tension: 0.3,
      spanGaps: true,
      fill: true,
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart
        if (!chartArea) return 'rgba(251, 101, 55, 0.08)'
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(251, 101, 55, 0.18)')
        gradient.addColorStop(1, 'rgba(251, 101, 55, 0)')
        return gradient
      },
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      backgroundColor: '#1a1a1a',
      borderColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      displayColors: false,
      callbacks: {
        label: (item) => formatMetricValue(props.metric.key, item.parsed.y),
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.08)' },
      ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.08)' },
      ticks: { color: 'rgba(255,255,255,0.5)' },
    },
  },
}))
</script>

<template>
  <div class="h-[220px] sm:h-[300px]">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
