import { describe, it, expect } from 'vitest'
import {
  createEmptyMeasurementForm,
  measurementToForm,
  formToMeasurementData,
} from '../measurementForm'
import { METRIC_KEYS } from '../../models/measurementMetrics'

function measurementData(overrides) {
  const data = { measuredAt: '2026-07-01', notes: 'Buena semana' }
  for (const key of METRIC_KEYS) data[key] = null
  return { ...data, weightKg: 78.4, bodyFatPct: 22.1, visceralFat: 5, ...overrides }
}

describe('createEmptyMeasurementForm', () => {
  it('has measuredAt set to today and every metric as empty string', () => {
    const form = createEmptyMeasurementForm()
    expect(form.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(form.notes).toBe('')
    for (const key of METRIC_KEYS) {
      expect(form[key]).toBe('')
    }
  })
})

describe('measurementToForm', () => {
  it('converts values to strings with comma decimals', () => {
    const form = measurementToForm(measurementData())
    expect(form.weightKg).toBe('78,4')
    expect(form.visceralFat).toBe('5')
    expect(form.measuredAt).toBe('2026-07-01')
  })

  it('converts null metrics to empty strings', () => {
    const form = measurementToForm(measurementData())
    expect(form.waistCm).toBe('')
    expect(form.metabolicAge).toBe('')
  })
})

describe('formToMeasurementData', () => {
  it('normalizes comma decimals', () => {
    const form = { ...createEmptyMeasurementForm(), measuredAt: '2026-07-01', weightKg: '78,4' }
    expect(formToMeasurementData(form).weightKg).toBe(78.4)
  })

  it('accepts dot decimals too', () => {
    const form = { ...createEmptyMeasurementForm(), measuredAt: '2026-07-01', weightKg: '78.4' }
    expect(formToMeasurementData(form).weightKg).toBe(78.4)
  })

  it('converts empty strings to null', () => {
    const data = formToMeasurementData({ ...createEmptyMeasurementForm(), measuredAt: '2026-07-01' })
    for (const key of METRIC_KEYS) {
      expect(data[key]).toBeNull()
    }
    expect(data.notes).toBeNull()
  })

  it('converts non-numeric input to null', () => {
    const form = { ...createEmptyMeasurementForm(), measuredAt: '2026-07-01', weightKg: 'abc' }
    expect(formToMeasurementData(form).weightKg).toBeNull()
  })
})

describe('round-trip: measurementToForm → formToMeasurementData', () => {
  it('preserves measurement values', () => {
    const original = measurementData()
    const roundTrip = formToMeasurementData(measurementToForm(original))
    expect(roundTrip.measuredAt).toBe(original.measuredAt)
    expect(roundTrip.notes).toBe(original.notes)
    expect(roundTrip.weightKg).toBe(original.weightKg)
    expect(roundTrip.bodyFatPct).toBe(original.bodyFatPct)
    expect(roundTrip.visceralFat).toBe(original.visceralFat)
    expect(roundTrip.waistCm).toBeNull()
  })
})
