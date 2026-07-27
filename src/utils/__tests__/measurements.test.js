import { describe, it, expect } from 'vitest'
import {
  getDelta,
  formatDelta,
  deltaTone,
  latestValue,
  latestDelta,
  presentMetrics,
  chartableMetrics,
  subtractMonths,
  filterByMonths,
  spansMoreThanMonths,
} from '../measurements'
import { getMetric } from '../../models/measurementMetrics'

// Sorted by measuredAt ascending, with nulls to skip
const measurements = [
  { id: 'a', measuredAt: '2026-01-10', weightKg: 80, waistCm: 90, musclePct: 38 },
  { id: 'b', measuredAt: '2026-02-10', weightKg: null, waistCm: 88, musclePct: 38.5 },
  { id: 'c', measuredAt: '2026-03-10', weightKg: 78.5, waistCm: null, musclePct: null },
]

describe('getDelta', () => {
  it('computes delta vs previous measurement', () => {
    expect(getDelta(measurements, 1, 'waistCm')).toBe(-2)
  })

  it('skips nulls to find the previous value', () => {
    expect(getDelta(measurements, 2, 'weightKg')).toBe(-1.5)
  })

  it('returns null when current value is null', () => {
    expect(getDelta(measurements, 1, 'weightKg')).toBeNull()
  })

  it('returns null for the first value of a metric', () => {
    expect(getDelta(measurements, 0, 'weightKg')).toBeNull()
  })
})

describe('formatDelta', () => {
  it('formats negative delta with metric decimals and comma', () => {
    expect(formatDelta('weightKg', -1.5)).toBe('−1,5')
  })

  it('formats positive delta with plus sign', () => {
    expect(formatDelta('weightKg', 0.5)).toBe('+0,5')
  })

  it('formats integer metrics without decimals', () => {
    expect(formatDelta('metabolicAge', -1)).toBe('−1')
  })

  it('returns empty string for null delta', () => {
    expect(formatDelta('weightKg', null)).toBe('')
  })
})

describe('deltaTone', () => {
  it('lowerIsBetter=true: decrease is good, increase is bad', () => {
    const weight = getMetric('weightKg')
    expect(deltaTone(weight, -1)).toBe('good')
    expect(deltaTone(weight, 1)).toBe('bad')
  })

  it('lowerIsBetter=false: increase is good, decrease is bad', () => {
    const muscle = getMetric('musclePct')
    expect(deltaTone(muscle, 1)).toBe('good')
    expect(deltaTone(muscle, -1)).toBe('bad')
  })

  it('lowerIsBetter=null: always neutral', () => {
    const chest = getMetric('chestCm')
    expect(deltaTone(chest, 5)).toBe('neutral')
    expect(deltaTone(chest, -5)).toBe('neutral')
  })

  it('zero or null delta is neutral', () => {
    const weight = getMetric('weightKg')
    expect(deltaTone(weight, 0)).toBe('neutral')
    expect(deltaTone(weight, null)).toBe('neutral')
  })
})

describe('latestValue', () => {
  it('returns the most recent non-null value', () => {
    expect(latestValue(measurements, 'weightKg')).toBe(78.5)
    expect(latestValue(measurements, 'waistCm')).toBe(88)
  })

  it('returns null when the metric has no values', () => {
    expect(latestValue(measurements, 'hipCm')).toBeNull()
  })
})

describe('presentMetrics', () => {
  it('returns only metrics with at least one value', () => {
    const keys = presentMetrics(measurements).map((m) => m.key)
    expect(keys).toEqual(['weightKg', 'musclePct', 'waistCm'])
  })

  it('returns empty array for no measurements', () => {
    expect(presentMetrics([])).toEqual([])
  })
})

describe('latestDelta', () => {
  it('returns the delta of the most recent non-null value vs the previous one', () => {
    expect(latestDelta(measurements, 'weightKg')).toBe(-1.5)
  })

  it('skips nulls to find the most recent value', () => {
    expect(latestDelta(measurements, 'musclePct')).toBe(0.5)
  })

  it('returns null when the metric has no comparable previous value', () => {
    expect(latestDelta(measurements, 'hipCm')).toBeNull()
  })
})

describe('chartableMetrics', () => {
  it('excludes metrics with fewer than 2 values', () => {
    const withOneValue = [
      { id: 'a', measuredAt: '2026-01-10', chestCm: 95 },
      { id: 'b', measuredAt: '2026-02-10', chestCm: null },
    ]
    expect(chartableMetrics(withOneValue)).toEqual([])
  })

  it('includes metrics with 2+ values, even with nulls in between', () => {
    const keys = chartableMetrics(measurements).map((m) => m.key)
    expect(keys).toEqual(['weightKg', 'musclePct', 'waistCm'])
  })

  it('returns empty array for no measurements', () => {
    expect(chartableMetrics([])).toEqual([])
  })

  it('excludes bodyProfile even with many values (categorical, not linear)', () => {
    const withBodyProfile = [
      { id: 'a', measuredAt: '2026-01-10', bodyProfile: 3 },
      { id: 'b', measuredAt: '2026-02-10', bodyProfile: 4 },
      { id: 'c', measuredAt: '2026-03-10', bodyProfile: 5 },
    ]
    const keys = chartableMetrics(withBodyProfile).map((m) => m.key)
    expect(keys).not.toContain('bodyProfile')
  })
})

describe('subtractMonths', () => {
  it('subtracts months within the same year', () => {
    expect(subtractMonths('2026-07-15', 3)).toBe('2026-04-15')
  })

  it('crosses a year boundary', () => {
    expect(subtractMonths('2026-01-15', 3)).toBe('2025-10-15')
  })

  it('clamps the day to the target month last day', () => {
    expect(subtractMonths('2026-03-31', 1)).toBe('2026-02-28')
  })
})

describe('filterByMonths', () => {
  const range = [
    { id: 'a', measuredAt: '2025-01-10' },
    { id: 'b', measuredAt: '2025-06-10' },
    { id: 'c', measuredAt: '2026-01-10' },
    { id: 'd', measuredAt: '2026-03-10' },
  ]

  it('anchors the window on the latest measurement, not on today', () => {
    // Cutoff: 2026-03-10 - 3 months = 2025-12-10
    expect(filterByMonths(range, 3).map((m) => m.id)).toEqual(['c', 'd'])
  })

  it('includes measurements exactly on the cutoff date', () => {
    const measurements = [
      { id: 'a', measuredAt: '2025-12-10' },
      { id: 'b', measuredAt: '2026-03-10' },
    ]
    expect(filterByMonths(measurements, 3).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('returns the array unchanged when months is null', () => {
    expect(filterByMonths(range, null)).toBe(range)
  })

  it('returns an empty array unchanged', () => {
    expect(filterByMonths([], 6)).toEqual([])
  })
})

describe('spansMoreThanMonths', () => {
  it('returns true when the earliest measurement is before the cutoff', () => {
    const range = [
      { id: 'a', measuredAt: '2025-01-10' },
      { id: 'b', measuredAt: '2026-03-10' },
    ]
    expect(spansMoreThanMonths(range, 6)).toBe(true)
  })

  it('returns false when the whole history fits within the window', () => {
    const range = [
      { id: 'a', measuredAt: '2026-01-10' },
      { id: 'b', measuredAt: '2026-03-10' },
    ]
    expect(spansMoreThanMonths(range, 6)).toBe(false)
  })

  it('returns false for fewer than 2 measurements', () => {
    expect(spansMoreThanMonths([{ id: 'a', measuredAt: '2026-01-10' }], 6)).toBe(false)
  })
})
