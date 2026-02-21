import { describe, it, expect } from 'vitest'
import { isTimed, getBlockLabel, getRepsSubcase } from '../blockTypes'

describe('isTimed', () => {
  it('returns true for "timed"', () => {
    expect(isTimed('timed')).toBe(true)
  })
  it('returns false for "reps"', () => {
    expect(isTimed('reps')).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(isTimed(undefined)).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isTimed('')).toBe(false)
  })
})

describe('getBlockLabel', () => {
  it('returns subtype label for known timed subtype', () => {
    expect(getBlockLabel({ type: 'timed', subtype: 'amrap' })).toBe('AMRAP')
    expect(getBlockLabel({ type: 'timed', subtype: 'emom' })).toBe('EMOM')
    expect(getBlockLabel({ type: 'timed', subtype: 'tabata' })).toBe('Tabata')
    expect(getBlockLabel({ type: 'timed', subtype: 'custom' })).toBe('Personalizada')
  })
  it('returns block type label when no subtype', () => {
    expect(getBlockLabel({ type: 'timed' })).toBe('Por tiempo')
    expect(getBlockLabel({ type: 'reps' })).toBe('Por repeticiones')
  })
  it('returns raw type string for unknown type', () => {
    expect(getBlockLabel({ type: 'unknown' })).toBe('unknown')
  })
  it('ignores subtype on reps blocks', () => {
    // reps blocks don't use TIMED_SUBTYPES
    expect(getBlockLabel({ type: 'reps', subtype: 'amrap' })).toBe('Por repeticiones')
  })
})

describe('getRepsSubcase', () => {
  it('returns subtype directly if set', () => {
    expect(getRepsSubcase({ subtype: 'sameReps' })).toBe('sameReps')
    expect(getRepsSubcase({ subtype: 'perRound' })).toBe('perRound')
    expect(getRepsSubcase({ subtype: 'perExercise' })).toBe('perExercise')
  })
  it('returns "perRound" when repsPerRound has entries', () => {
    expect(getRepsSubcase({ repsPerRound: [21, 15, 9] })).toBe('perRound')
  })
  it('returns "sameReps" when repsEveryRound is set', () => {
    expect(getRepsSubcase({ repsEveryRound: 10 })).toBe('sameReps')
  })
  it('returns "perExercise" when neither repsPerRound nor repsEveryRound', () => {
    expect(getRepsSubcase({})).toBe('perExercise')
    expect(getRepsSubcase({ repsPerRound: [] })).toBe('perExercise')
    expect(getRepsSubcase({ repsEveryRound: null })).toBe('perExercise')
  })
  it('subtype takes priority over repsPerRound', () => {
    expect(getRepsSubcase({ subtype: 'sameReps', repsPerRound: [21, 15, 9] })).toBe('sameReps')
  })
})
