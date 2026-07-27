import { describe, it, expect } from 'vitest'
import {
  METRIC_GROUPS,
  MEASUREMENT_METRICS,
  METRIC_KEYS,
  getMetric,
  formatMetricValue,
} from '../measurementMetrics'

describe('MEASUREMENT_METRICS', () => {
  it('has unique keys', () => {
    expect(new Set(METRIC_KEYS).size).toBe(METRIC_KEYS.length)
  })

  it('every metric has all required fields', () => {
    const groupKeys = METRIC_GROUPS.map((g) => g.key)
    for (const metric of MEASUREMENT_METRICS) {
      expect(metric.key).toBeTruthy()
      expect(metric.label).toBeTruthy()
      expect(typeof metric.unit).toBe('string')
      expect(typeof metric.decimals).toBe('number')
      expect(groupKeys).toContain(metric.group)
      expect([true, false, null]).toContain(metric.lowerIsBetter)
      expect(typeof metric.min).toBe('number')
      expect(typeof metric.max).toBe('number')
      expect(metric.min).toBeLessThan(metric.max)
    }
  })

  it('covers the 17 agreed metrics', () => {
    expect(MEASUREMENT_METRICS).toHaveLength(17)
  })
})

describe('getMetric', () => {
  it('returns the metric by key', () => {
    expect(getMetric('weightKg').label).toBe('Peso')
  })

  it('returns null for unknown key', () => {
    expect(getMetric('nope')).toBeNull()
  })
})

describe('formatMetricValue', () => {
  it('formats with unit and comma decimal', () => {
    expect(formatMetricValue('weightKg', 78.4)).toBe('78,4 kg')
  })

  it('formats decimal visceralFat', () => {
    expect(formatMetricValue('visceralFat', 5.5)).toBe('5,5')
  })

  it('formats integer metrics without decimals', () => {
    expect(formatMetricValue('basalMetabolicRate', 1650)).toBe('1650 kcal')
  })

  it('returns em dash for null', () => {
    expect(formatMetricValue('weightKg', null)).toBe('—')
  })
})
