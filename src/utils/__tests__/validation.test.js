import { describe, it, expect } from 'vitest'
import { validateBlock, validateClass } from '../validation'

// Helpers
function validTimedBlock(overrides) {
  return {
    name: 'AMRAP 12',
    type: 'timed',
    rounds: 1,
    workSeconds: 720,
    restSeconds: 0,
    exerciseMode: 'all',
    exercises: [{ name: 'Thrusters', repsEveryRound: 15 }],
    ...overrides,
  }
}

function validRepsBlock(overrides) {
  return {
    name: 'Fran',
    type: 'reps',
    rounds: 3,
    repsPerRound: [21, 15, 9],
    exercises: [{ name: 'Thrusters' }, { name: 'Pull-ups' }],
    ...overrides,
  }
}

describe('validateBlock — common', () => {
  it('rejects empty name', () => {
    const r = validateBlock(validTimedBlock({ name: '' }))
    expect(r.valid).toBe(false)
    expect(r.message).toBeTruthy()
  })

  it('rejects whitespace-only name', () => {
    const r = validateBlock(validTimedBlock({ name: '   ' }))
    expect(r.valid).toBe(false)
  })

  it('rejects invalid type', () => {
    const r = validateBlock(validTimedBlock({ type: 'amrap' }))
    expect(r.valid).toBe(false)
  })

  it('rejects block with no exercises', () => {
    const r = validateBlock(validTimedBlock({ exercises: [] }))
    expect(r.valid).toBe(false)
  })

  it('rejects block where all exercises have empty names', () => {
    const r = validateBlock(validTimedBlock({ exercises: [{ name: '' }, { name: '  ' }] }))
    expect(r.valid).toBe(false)
  })
})

describe('validateBlock — timed', () => {
  it('accepts valid timed block', () => {
    expect(validateBlock(validTimedBlock()).valid).toBe(true)
  })

  it('rejects workSeconds = 0', () => {
    const r = validateBlock(validTimedBlock({ workSeconds: 0 }))
    expect(r.valid).toBe(false)
  })

  it('rejects negative workSeconds', () => {
    const r = validateBlock(validTimedBlock({ workSeconds: -60 }))
    expect(r.valid).toBe(false)
  })

  it('rejects rounds < 1', () => {
    const r = validateBlock(validTimedBlock({ rounds: 0 }))
    expect(r.valid).toBe(false)
  })

  it('rejects negative restSeconds', () => {
    const r = validateBlock(validTimedBlock({ restSeconds: -10 }))
    expect(r.valid).toBe(false)
  })

  it('accepts restSeconds = 0', () => {
    const r = validateBlock(validTimedBlock({ restSeconds: 0 }))
    expect(r.valid).toBe(true)
  })

  it('rejects AMRAP exercise without repsEveryRound', () => {
    const r = validateBlock(validTimedBlock({
      subtype: 'amrap',
      exercises: [{ name: 'Burpees', repsEveryRound: null }],
    }))
    expect(r.valid).toBe(false)
  })

  it('rejects EMOM exercise without repsEveryRound', () => {
    const r = validateBlock(validTimedBlock({
      subtype: 'emom',
      exercises: [{ name: 'Power Cleans' }],
    }))
    expect(r.valid).toBe(false)
  })
})

describe('validateBlock — reps', () => {
  it('accepts valid reps block (perRound)', () => {
    expect(validateBlock(validRepsBlock()).valid).toBe(true)
  })

  it('accepts sameReps sub-case', () => {
    const r = validateBlock(validRepsBlock({
      repsPerRound: undefined,
      repsEveryRound: 10,
    }))
    expect(r.valid).toBe(true)
  })

  it('rejects sameReps with repsEveryRound missing', () => {
    const r = validateBlock({
      name: 'Test',
      type: 'reps',
      rounds: 3,
      subtype: 'sameReps',
      repsEveryRound: null,
      exercises: [{ name: 'Squat' }],
    })
    expect(r.valid).toBe(false)
  })

  it('rejects perRound with empty repsPerRound array', () => {
    const r = validateBlock(validRepsBlock({ repsPerRound: [] }))
    expect(r.valid).toBe(false)
  })

  it('rejects perRound with non-positive rep values', () => {
    const r = validateBlock(validRepsBlock({ repsPerRound: [21, 0, 9] }))
    expect(r.valid).toBe(false)
  })

  it('accepts perExercise when all exercises have repsEveryRound', () => {
    const r = validateBlock({
      name: 'Accessory',
      type: 'reps',
      rounds: 3,
      exercises: [
        { name: 'DB Rows', repsEveryRound: 12 },
        { name: 'Curls', repsEveryRound: 10 },
      ],
    })
    expect(r.valid).toBe(true)
  })

  it('rejects perExercise when any exercise lacks repsEveryRound', () => {
    const r = validateBlock({
      name: 'Accessory',
      type: 'reps',
      rounds: 3,
      exercises: [
        { name: 'DB Rows', repsEveryRound: 12 },
        { name: 'Plank', repsEveryRound: null },
      ],
    })
    expect(r.valid).toBe(false)
  })
})

describe('validateClass', () => {
  const validClass = {
    name: 'Monday WOD',
    blocks: [
      { blockData: validTimedBlock() },
    ],
  }

  it('accepts valid class', () => {
    expect(validateClass(validClass).valid).toBe(true)
  })

  it('rejects empty name', () => {
    expect(validateClass({ ...validClass, name: '' }).valid).toBe(false)
  })

  it('rejects class with no blocks', () => {
    expect(validateClass({ ...validClass, blocks: [] }).valid).toBe(false)
  })

  it('rejects class with a block missing blockData', () => {
    const r = validateClass({ name: 'Test', blocks: [{}] })
    expect(r.valid).toBe(false)
  })

  it('rejects class when a block fails validation', () => {
    const r = validateClass({
      name: 'Test',
      blocks: [{ blockData: { ...validTimedBlock(), name: '' } }],
    })
    expect(r.valid).toBe(false)
  })
})
