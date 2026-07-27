/**
 * Shared helpers for measurement deltas, tones and metric presence.
 * All functions expect `measurements` sorted by measuredAt ascending.
 */

import { MEASUREMENT_METRICS } from '../models/measurementMetrics'

/**
 * Delta of measurements[index][key] vs the closest previous measurement
 * that has a value for that key (skipping nulls). Null if no comparison.
 */
export function getDelta(measurements, index, key) {
  const current = measurements[index]?.[key]
  if (current == null) return null
  for (let i = index - 1; i >= 0; i--) {
    const previous = measurements[i][key]
    if (previous != null) return current - previous
  }
  return null
}

export function formatDelta(key, delta) {
  if (delta == null) return ''
  const metric = MEASUREMENT_METRICS.find((m) => m.key === key)
  const decimals = metric?.decimals ?? 1
  const abs = Math.abs(delta).toFixed(decimals).replace('.', ',')
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${abs}`
}

export function deltaTone(metric, delta) {
  if (delta == null || delta === 0 || metric.lowerIsBetter == null) return 'neutral'
  const improved = metric.lowerIsBetter ? delta < 0 : delta > 0
  return improved ? 'good' : 'bad'
}

export function latestValue(measurements, key) {
  for (let i = measurements.length - 1; i >= 0; i--) {
    if (measurements[i][key] != null) return measurements[i][key]
  }
  return null
}

/** Delta of the latest value for a metric vs the previous one (skipping nulls). */
export function latestDelta(measurements, key) {
  for (let i = measurements.length - 1; i >= 0; i--) {
    if (measurements[i][key] != null) return getDelta(measurements, i, key)
  }
  return null
}

/** Metrics that have at least one value across all measurements. */
export function presentMetrics(measurements) {
  return MEASUREMENT_METRICS.filter((metric) =>
    measurements.some((m) => m[metric.key] != null),
  )
}

/** Metrics with a meaningful trend line: chartable and with at least 2 data points. */
export function chartableMetrics(measurements) {
  return presentMetrics(measurements).filter(
    (metric) =>
      metric.chartable !== false &&
      measurements.filter((m) => m[metric.key] != null).length >= 2,
  )
}

export const TONE_CLASS = {
  good: 'text-green-400',
  bad: 'text-gymDanger',
  neutral: 'text-white/40',
}

/** Subtracts `months` from a 'YYYY-MM-DD' string, clamping the day to the target month's last day. */
export function subtractMonths(dateString, months) {
  const [year, month, day] = dateString.split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) - months
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = totalMonths % 12 // 0-based
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, lastDayOfTargetMonth)
  const mm = String(targetMonth + 1).padStart(2, '0')
  const dd = String(targetDay).padStart(2, '0')
  return `${targetYear}-${mm}-${dd}`
}

/**
 * Measurements within the last `months` months, counting back from the LATEST
 * measurement (not from today) — so the chart never goes empty for an inactive client.
 * `months` null/0 returns the array unchanged.
 */
export function filterByMonths(measurements, months) {
  if (!months || !measurements.length) return measurements
  const cutoff = subtractMonths(measurements[measurements.length - 1].measuredAt, months)
  return measurements.filter((m) => m.measuredAt >= cutoff)
}

/** Whether the full history spans more than `months` months (used to decide which range options to offer). */
export function spansMoreThanMonths(measurements, months) {
  if (measurements.length < 2) return false
  const cutoff = subtractMonths(measurements[measurements.length - 1].measuredAt, months)
  return measurements[0].measuredAt < cutoff
}
