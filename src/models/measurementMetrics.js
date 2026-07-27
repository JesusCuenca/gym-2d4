/**
 * Single source of truth for client measurement metrics.
 * Iterated by the measurement form, table, summary cards and charts.
 *
 * lowerIsBetter: true → a decrease is an improvement (green delta),
 * false → an increase is an improvement, null → neutral (no coloring).
 */

export const METRIC_GROUPS = [
  { key: 'tanita', label: 'Báscula Tanita' },
  { key: 'girths', label: 'Perímetros (cm)' },
]

export const MEASUREMENT_METRICS = [
  // Tanita scale
  { key: 'weightKg', label: 'Peso', unit: 'kg', decimals: 1, group: 'tanita', lowerIsBetter: true, min: 20, max: 300 },
  { key: 'bodyFatPct', label: 'Grasa', unit: '%', decimals: 1, group: 'tanita', lowerIsBetter: true, min: 1, max: 75 },
  { key: 'bonePct', label: 'Hueso', unit: '%', decimals: 1, group: 'tanita', lowerIsBetter: null, min: 1, max: 20 },
  { key: 'waterPct', label: 'Líquido', unit: '%', decimals: 1, group: 'tanita', lowerIsBetter: false, min: 1, max: 90 },
  { key: 'musclePct', label: 'Músculo', unit: '%', decimals: 1, group: 'tanita', lowerIsBetter: false, min: 1, max: 90 },
  // bodyProfile is a categorical index (1-9), not a linear scale — excluded from charts
  { key: 'bodyProfile', label: 'Perfil', unit: '', decimals: 0, group: 'tanita', lowerIsBetter: null, min: 1, max: 9, integer: true, chartable: false },
  { key: 'basalMetabolicRate', label: 'Índice metabólico', unit: 'kcal', decimals: 0, group: 'tanita', lowerIsBetter: null, min: 500, max: 5000, integer: true },
  { key: 'metabolicAge', label: 'Edad metabólica', unit: 'años', decimals: 0, group: 'tanita', lowerIsBetter: true, min: 12, max: 99, integer: true },
  { key: 'dailyCalorieIntake', label: 'Ingesta calórica diaria', unit: 'kcal', decimals: 0, group: 'tanita', lowerIsBetter: null, min: 500, max: 10000, integer: true },
  { key: 'visceralFat', label: 'Grasa visceral', unit: '', decimals: 1, group: 'tanita', lowerIsBetter: true, min: 1, max: 59 },
  // Body girths
  { key: 'waistCm', label: 'Cintura', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: true, min: 10, max: 250 },
  { key: 'hipCm', label: 'Cadera', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: true, min: 10, max: 250 },
  { key: 'chestCm', label: 'Pecho', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: null, min: 10, max: 250 },
  { key: 'armLeftCm', label: 'Brazo izq.', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: null, min: 10, max: 250 },
  { key: 'armRightCm', label: 'Brazo der.', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: null, min: 10, max: 250 },
  { key: 'thighLeftCm', label: 'Muslo izq.', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: null, min: 10, max: 250 },
  { key: 'thighRightCm', label: 'Muslo der.', unit: 'cm', decimals: 1, group: 'girths', lowerIsBetter: null, min: 10, max: 250 },
]

export const METRIC_KEYS = MEASUREMENT_METRICS.map((m) => m.key)

export function getMetric(key) {
  return MEASUREMENT_METRICS.find((m) => m.key === key) || null
}

export function formatMetricValue(key, value) {
  if (value == null) return '—'
  const metric = getMetric(key)
  if (!metric) return String(value)
  const formatted = metric.decimals > 0
    ? value.toFixed(metric.decimals).replace('.', ',')
    : String(Math.round(value))
  return metric.unit ? `${formatted} ${metric.unit}` : formatted
}
