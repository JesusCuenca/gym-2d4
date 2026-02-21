import { describe, it, expect } from 'vitest'
import { timeStringToSeconds, secondsToTimeString, formatTimer, formatTimerTwoLine } from '../time'

describe('timeStringToSeconds', () => {
  it('converts "01:30" to 90', () => {
    expect(timeStringToSeconds('01:30')).toBe(90)
  })
  it('converts "00:00" to 0', () => {
    expect(timeStringToSeconds('00:00')).toBe(0)
  })
  it('converts "10:00" to 600', () => {
    expect(timeStringToSeconds('10:00')).toBe(600)
  })
  it('handles single-digit minutes "5:30" → 330', () => {
    expect(timeStringToSeconds('5:30')).toBe(330)
  })
  it('returns 0 for empty string', () => {
    expect(timeStringToSeconds('')).toBe(0)
  })
})

describe('secondsToTimeString', () => {
  it('converts 90 to "01:30"', () => {
    expect(secondsToTimeString(90)).toBe('01:30')
  })
  it('converts 0 to "00:00"', () => {
    expect(secondsToTimeString(0)).toBe('00:00')
  })
  it('converts 3599 to "59:59"', () => {
    expect(secondsToTimeString(3599)).toBe('59:59')
  })
  it('pads single-digit minutes', () => {
    expect(secondsToTimeString(60)).toBe('01:00')
  })
  it('pads single-digit seconds', () => {
    expect(secondsToTimeString(61)).toBe('01:01')
  })
})

describe('formatTimer', () => {
  it('formats 90 as "01:30"', () => {
    expect(formatTimer(90)).toBe('01:30')
  })
  it('clamps negative values to "00:00"', () => {
    expect(formatTimer(-5)).toBe('00:00')
  })
  it('returns "00:00" for NaN', () => {
    expect(formatTimer(NaN)).toBe('00:00')
  })
  it('floors fractional seconds', () => {
    expect(formatTimer(90.9)).toBe('01:30')
  })
  it('formats 0 as "00:00"', () => {
    expect(formatTimer(0)).toBe('00:00')
  })
})

describe('formatTimerTwoLine', () => {
  it('returns two lines for values >= 100 seconds', () => {
    const result = formatTimerTwoLine(100)
    expect(result.minutes).toBe('1')
    expect(result.seconds).toBe(':40')
  })
  it('returns only seconds line for values < 100', () => {
    const result = formatTimerTwoLine(99)
    expect(result.minutes).toBeNull()
    // 99s = 1min 39sec → seconds part is :39
    expect(result.seconds).toBe(':39')
  })
  it('boundary: 99 → single line', () => {
    const { minutes } = formatTimerTwoLine(99)
    expect(minutes).toBeNull()
  })
  it('boundary: 100 → two lines', () => {
    const { minutes } = formatTimerTwoLine(100)
    expect(minutes).not.toBeNull()
  })
  it('is NaN-safe (returns "00:00" equivalent)', () => {
    const result = formatTimerTwoLine(NaN)
    expect(result.minutes).toBeNull()
    expect(result.seconds).toBe(':00')
  })
  it('pads seconds with leading zero', () => {
    const result = formatTimerTwoLine(61)
    expect(result.seconds).toBe(':01')
  })
})
