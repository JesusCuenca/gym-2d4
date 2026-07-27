import { describe, it, expect } from 'vitest'
import { validateBlock, validateClass, validateClient, validateMeasurement, CHAR_LIMITS } from '../validation'

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

  it('accepts intervals block with valid workSecondsPerRound', () => {
    const r = validateBlock(validTimedBlock({
      subtype: 'intervals',
      workSeconds: 30,
      workSecondsPerRound: [30, 35, 40],
      rounds: 3,
    }))
    expect(r.valid).toBe(true)
  })

  it('rejects intervals block with empty workSecondsPerRound', () => {
    const r = validateBlock(validTimedBlock({
      subtype: 'intervals',
      workSecondsPerRound: [],
    }))
    expect(r.valid).toBe(false)
  })

  it('rejects intervals block with a non-positive value in workSecondsPerRound', () => {
    const r = validateBlock(validTimedBlock({
      subtype: 'intervals',
      workSeconds: 30,
      workSecondsPerRound: [30, 0, 40],
      rounds: 3,
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

// --- validateClient ---

function validClient(overrides) {
  return {
    name: 'María García',
    email: 'maria@example.com',
    phone: '600000000',
    birthDate: '1990-05-12',
    heightCm: 168,
    dietaryNotes: 'Intolerante a la lactosa',
    notes: 'Objetivo: perder grasa',
    ...overrides,
  }
}

describe('validateClient', () => {
  it('accepts a valid client', () => {
    expect(validateClient(validClient()).valid).toBe(true)
  })

  it('accepts a minimal client (only name)', () => {
    const r = validateClient({ name: 'Ana', email: null, phone: null, birthDate: null, heightCm: null, dietaryNotes: null, notes: null })
    expect(r.valid).toBe(true)
  })

  it('rejects missing name', () => {
    const r = validateClient(validClient({ name: '' }))
    expect(r.valid).toBe(false)
    expect(r.message).toBeTruthy()
  })

  it('rejects whitespace-only name', () => {
    expect(validateClient(validClient({ name: '   ' })).valid).toBe(false)
  })

  it('rejects name over the char limit', () => {
    const r = validateClient(validClient({ name: 'a'.repeat(CHAR_LIMITS.clientName + 1) }))
    expect(r.valid).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(validateClient(validClient({ email: 'not-an-email' })).valid).toBe(false)
  })

  it('rejects invalid birthDate format', () => {
    expect(validateClient(validClient({ birthDate: '12/05/1990' })).valid).toBe(false)
  })

  it('rejects heightCm out of range', () => {
    expect(validateClient(validClient({ heightCm: 30 })).valid).toBe(false)
    expect(validateClient(validClient({ heightCm: 300 })).valid).toBe(false)
  })
})

// --- validateMeasurement ---

function validMeasurement(overrides) {
  return {
    measuredAt: '2026-07-01',
    weightKg: 78.4,
    bodyFatPct: 22.1,
    notes: null,
    ...overrides,
  }
}

describe('validateMeasurement', () => {
  it('accepts a valid measurement', () => {
    expect(validateMeasurement(validMeasurement()).valid).toBe(true)
  })

  it('accepts minimal measurement (date + one metric)', () => {
    expect(validateMeasurement({ measuredAt: '2026-07-01', waistCm: 80 }).valid).toBe(true)
  })

  it('rejects missing measuredAt', () => {
    const r = validateMeasurement(validMeasurement({ measuredAt: '' }))
    expect(r.valid).toBe(false)
  })

  it('rejects malformed measuredAt', () => {
    expect(validateMeasurement(validMeasurement({ measuredAt: '01-07-2026' })).valid).toBe(false)
  })

  it('rejects measurement with zero metrics filled', () => {
    const r = validateMeasurement({ measuredAt: '2026-07-01', notes: 'solo notas' })
    expect(r.valid).toBe(false)
    expect(r.message).toBe('Debes rellenar al menos una medida.')
  })

  it('rejects out-of-range value with label and range in the message', () => {
    const r = validateMeasurement(validMeasurement({ weightKg: 500 }))
    expect(r.valid).toBe(false)
    expect(r.message).toContain('Peso')
    expect(r.message).toContain('300')
  })

  it('accepts decimal visceralFat', () => {
    expect(validateMeasurement(validMeasurement({ visceralFat: 5.5 })).valid).toBe(true)
  })

  it('rejects non-integer value for integer metrics', () => {
    const r = validateMeasurement(validMeasurement({ metabolicAge: 35.5 }))
    expect(r.valid).toBe(false)
    expect(r.message).toContain('entero')
  })

  it('rejects notes over the char limit', () => {
    const r = validateMeasurement(validMeasurement({ notes: 'a'.repeat(CHAR_LIMITS.measurementNotes + 1) }))
    expect(r.valid).toBe(false)
  })
})
