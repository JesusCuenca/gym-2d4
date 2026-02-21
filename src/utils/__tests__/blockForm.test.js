import { describe, it, expect } from 'vitest'
import { createEmptyForm, createEmptyExercise, blockDataToForm, formToBlockData } from '../blockForm'

// --- Fixtures ---

function timedBlockData(overrides) {
  return {
    name: 'AMRAP 12',
    type: 'timed',
    subtype: 'amrap',
    rounds: 1,
    workSeconds: 720,
    restSeconds: 0,
    exerciseMode: 'all',
    exercises: [
      { name: 'Thrusters', repsEveryRound: 15, notes: null },
      { name: 'Pull-ups', repsEveryRound: 9, notes: 'Strict' },
    ],
    ...overrides,
  }
}

function repsBlockData(overrides) {
  return {
    name: 'Fran',
    type: 'reps',
    subtype: 'perRound',
    rounds: 3,
    repsPerRound: [21, 15, 9],
    repsEveryRound: null,
    exercises: [
      { name: 'Thrusters', repsEveryRound: null, notes: '42.5kg' },
      { name: 'Pull-ups', repsEveryRound: null, notes: null },
    ],
    ...overrides,
  }
}

// --- createEmptyForm ---

describe('createEmptyForm', () => {
  it('returns an object with all expected fields', () => {
    const form = createEmptyForm()
    expect(form).toMatchObject({
      name: '',
      type: 'timed',
      subtype: 'custom',
      workMinutes: '15',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: [''],
    })
    expect(Array.isArray(form.exercises)).toBe(true)
    expect(form.exercises.length).toBe(1)
    expect(form.exercises[0]).toHaveProperty('_id')
    expect(form.exercises[0].name).toBe('')
  })
})

// --- createEmptyExercise ---

describe('createEmptyExercise', () => {
  it('returns an exercise with _id, name, repsEveryRound, notes', () => {
    const ex = createEmptyExercise()
    expect(ex).toMatchObject({ name: '', repsEveryRound: '', notes: '' })
    expect(typeof ex._id).toBe('number')
  })

  it('returns unique _id on each call', () => {
    const a = createEmptyExercise()
    const b = createEmptyExercise()
    expect(a._id).not.toBe(b._id)
  })
})

// --- blockDataToForm ---

describe('blockDataToForm — timed', () => {
  it('converts AMRAP block correctly', () => {
    const form = blockDataToForm(timedBlockData())
    expect(form.name).toBe('AMRAP 12')
    expect(form.type).toBe('timed')
    expect(form.subtype).toBe('amrap')
    expect(form.workMinutes).toBe('12')
    expect(form.workSeconds).toBe('00')
    expect(form.restMinutes).toBe('0')
    expect(form.restSeconds).toBe('00')
    expect(form.rounds).toBe('1')
    expect(form.exerciseMode).toBe('all')
  })

  it('converts exercises with _id and string reps', () => {
    const form = blockDataToForm(timedBlockData())
    expect(form.exercises).toHaveLength(2)
    expect(form.exercises[0].name).toBe('Thrusters')
    expect(form.exercises[0].repsEveryRound).toBe('15')
    expect(form.exercises[0].notes).toBe('')
    expect(form.exercises[1].notes).toBe('Strict')
    expect(typeof form.exercises[0]._id).toBe('number')
  })

  it('handles custom timed block with rest', () => {
    const form = blockDataToForm(timedBlockData({
      subtype: null,
      rounds: 4,
      workSeconds: 180,
      restSeconds: 60,
    }))
    expect(form.subtype).toBe('custom')
    expect(form.workMinutes).toBe('3')
    expect(form.workSeconds).toBe('00')
    expect(form.restMinutes).toBe('1')
    expect(form.restSeconds).toBe('00')
    expect(form.rounds).toBe('4')
  })

  it('handles Tabata preset (exerciseMode rotate)', () => {
    const form = blockDataToForm(timedBlockData({
      subtype: 'tabata',
      rounds: 8,
      workSeconds: 20,
      restSeconds: 10,
      exerciseMode: 'rotate',
    }))
    expect(form.subtype).toBe('tabata')
    expect(form.exerciseMode).toBe('rotate')
  })

  it('handles legacy preset field (backward compat)', () => {
    const data = { ...timedBlockData(), subtype: undefined, preset: 'emom' }
    const form = blockDataToForm(data)
    expect(form.subtype).toBe('emom')
  })

  it('handles missing workSeconds/restSeconds gracefully', () => {
    const form = blockDataToForm({ name: 'X', type: 'timed' })
    expect(form.workMinutes).toBe('0')
    expect(form.workSeconds).toBe('00')
    expect(form.restMinutes).toBe('0')
    expect(form.restSeconds).toBe('00')
  })

  it('handles missing exercises — provides one empty exercise', () => {
    const form = blockDataToForm({ name: 'X', type: 'timed' })
    expect(form.exercises).toHaveLength(1)
    expect(form.exercises[0].name).toBe('')
  })
})

describe('blockDataToForm — reps', () => {
  it('converts perRound block correctly', () => {
    const form = blockDataToForm(repsBlockData())
    expect(form.type).toBe('reps')
    expect(form.subtype).toBe('perRound')
    expect(form.repsPerRound).toEqual(['21', '15', '9'])
    expect(form.repsEveryRound).toBe('')
  })

  it('converts sameReps block correctly', () => {
    const form = blockDataToForm(repsBlockData({
      subtype: 'sameReps',
      repsEveryRound: 10,
      repsPerRound: null,
    }))
    expect(form.subtype).toBe('sameReps')
    expect(form.repsEveryRound).toBe('10')
    expect(form.repsPerRound).toEqual([''])
  })

  it('converts perExercise block correctly', () => {
    const form = blockDataToForm(repsBlockData({
      subtype: 'perExercise',
      repsEveryRound: null,
      repsPerRound: null,
    }))
    expect(form.subtype).toBe('perExercise')
  })

  it('infers subtype from data when subtype field is missing', () => {
    const data = { name: 'X', type: 'reps', repsEveryRound: 10, exercises: [] }
    const form = blockDataToForm(data)
    expect(form.subtype).toBe('sameReps')
  })
})

// --- formToBlockData ---

describe('formToBlockData — timed', () => {
  it('converts AMRAP form correctly', () => {
    const form = {
      name: 'AMRAP 12',
      type: 'timed',
      subtype: 'amrap',
      workMinutes: '12',
      workSeconds: '00',
      restMinutes: '2',
      restSeconds: '00',
      rounds: '3',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [{ name: 'Thrusters', repsEveryRound: '15', notes: '' }],
    }
    const data = formToBlockData(form)
    expect(data.name).toBe('AMRAP 12')
    expect(data.type).toBe('timed')
    expect(data.subtype).toBe('amrap')
    expect(data.workSeconds).toBe(720)
    expect(data.restSeconds).toBe(0) // amrap forces 0
    expect(data.rounds).toBe(1) // amrap forces 1
    expect(data.exerciseMode).toBe('all')
  })

  it('converts custom timed form correctly', () => {
    const form = {
      name: 'Intervals',
      type: 'timed',
      subtype: 'custom',
      workMinutes: '3',
      workSeconds: '00',
      restMinutes: '1',
      restSeconds: '00',
      rounds: '4',
      exerciseMode: 'rotate',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [{ name: 'Row', repsEveryRound: '', notes: 'Max cal' }],
    }
    const data = formToBlockData(form)
    expect(data.subtype).toBeNull()
    expect(data.workSeconds).toBe(180)
    expect(data.restSeconds).toBe(60)
    expect(data.rounds).toBe(4)
    expect(data.exerciseMode).toBe('rotate')
  })

  it('includes exercise reps when exerciseMode is all', () => {
    const form = {
      name: 'EMOM',
      type: 'timed',
      subtype: 'emom',
      workMinutes: '1',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '6',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [{ name: 'Power Cleans', repsEveryRound: '5', notes: '' }],
    }
    const data = formToBlockData(form)
    expect(data.exercises[0].repsEveryRound).toBe(5)
  })

  it('excludes exercise reps when exerciseMode is rotate', () => {
    const form = {
      name: 'Tabata',
      type: 'timed',
      subtype: 'tabata',
      workMinutes: '0',
      workSeconds: '20',
      restMinutes: '0',
      restSeconds: '10',
      rounds: '8',
      exerciseMode: 'rotate',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [{ name: 'Sit-ups', repsEveryRound: '20', notes: '' }],
    }
    const data = formToBlockData(form)
    expect(data.exercises[0].repsEveryRound).toBeNull()
  })

  it('filters out exercises with empty names', () => {
    const form = {
      name: 'Test',
      type: 'timed',
      subtype: 'custom',
      workMinutes: '5',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '1',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [
        { name: 'Burpees', repsEveryRound: '10', notes: '' },
        { name: '', repsEveryRound: '', notes: '' },
      ],
    }
    const data = formToBlockData(form)
    expect(data.exercises).toHaveLength(1)
    expect(data.exercises[0].name).toBe('Burpees')
  })
})

describe('formToBlockData — reps', () => {
  it('converts sameReps form correctly', () => {
    const form = {
      name: '5 Rounds',
      type: 'reps',
      subtype: 'sameReps',
      workMinutes: '0',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '5',
      exerciseMode: 'all',
      repsEveryRound: '10',
      repsPerRound: [''],
      exercises: [{ name: 'Deadlifts', repsEveryRound: '', notes: '' }],
    }
    const data = formToBlockData(form)
    expect(data.type).toBe('reps')
    expect(data.subtype).toBe('sameReps')
    expect(data.repsEveryRound).toBe(10)
    expect(data.repsPerRound).toBeNull()
    expect(data.rounds).toBe(5)
    expect(data.exercises[0].repsEveryRound).toBeNull() // sameReps ≠ perExercise
  })

  it('converts perRound form correctly', () => {
    const form = {
      name: 'Fran',
      type: 'reps',
      subtype: 'perRound',
      workMinutes: '0',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: ['21', '15', '9'],
      exercises: [
        { name: 'Thrusters', repsEveryRound: '', notes: '' },
        { name: 'Pull-ups', repsEveryRound: '', notes: '' },
      ],
    }
    const data = formToBlockData(form)
    expect(data.repsPerRound).toEqual([21, 15, 9])
    expect(data.rounds).toBe(3) // inferred from repsPerRound length
    expect(data.repsEveryRound).toBeNull()
  })

  it('filters invalid values from repsPerRound', () => {
    const form = {
      name: 'Test',
      type: 'reps',
      subtype: 'perRound',
      workMinutes: '0',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: ['21', '', '9'],
      exercises: [{ name: 'Squat', repsEveryRound: '', notes: '' }],
    }
    const data = formToBlockData(form)
    expect(data.repsPerRound).toEqual([21, 9])
  })

  it('converts perExercise form correctly', () => {
    const form = {
      name: 'Accessory',
      type: 'reps',
      subtype: 'perExercise',
      workMinutes: '0',
      workSeconds: '00',
      restMinutes: '0',
      restSeconds: '00',
      rounds: '3',
      exerciseMode: 'all',
      repsEveryRound: '',
      repsPerRound: [''],
      exercises: [
        { name: 'DB Rows', repsEveryRound: '12', notes: '' },
        { name: 'Curls', repsEveryRound: '10', notes: '' },
      ],
    }
    const data = formToBlockData(form)
    expect(data.repsEveryRound).toBeNull()
    expect(data.repsPerRound).toBeNull()
    expect(data.exercises[0].repsEveryRound).toBe(12)
    expect(data.exercises[1].repsEveryRound).toBe(10)
  })
})

// --- Round-trip ---

describe('round-trip: blockDataToForm → formToBlockData', () => {
  it('preserves timed AMRAP data', () => {
    const original = timedBlockData()
    const roundTrip = formToBlockData(blockDataToForm(original))
    expect(roundTrip.name).toBe(original.name)
    expect(roundTrip.type).toBe(original.type)
    expect(roundTrip.workSeconds).toBe(original.workSeconds)
    expect(roundTrip.restSeconds).toBe(original.restSeconds)
    expect(roundTrip.rounds).toBe(original.rounds)
    expect(roundTrip.exercises[0].name).toBe(original.exercises[0].name)
    expect(roundTrip.exercises[0].repsEveryRound).toBe(original.exercises[0].repsEveryRound)
  })

  it('preserves reps perRound data', () => {
    const original = repsBlockData()
    const roundTrip = formToBlockData(blockDataToForm(original))
    expect(roundTrip.name).toBe(original.name)
    expect(roundTrip.type).toBe(original.type)
    expect(roundTrip.repsPerRound).toEqual(original.repsPerRound)
    expect(roundTrip.rounds).toBe(original.rounds)
  })
})
