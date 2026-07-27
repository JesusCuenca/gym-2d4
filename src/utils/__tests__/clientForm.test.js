import { describe, it, expect } from 'vitest'
import { createEmptyClientForm, clientToForm, formToClientData } from '../clientForm'

function clientData(overrides) {
  return {
    name: 'María García',
    email: 'maria@example.com',
    phone: '600 000 000',
    birthDate: '1990-05-12',
    heightCm: 168,
    dietaryNotes: 'Sin lactosa',
    notes: 'Objetivo: tonificar',
    ...overrides,
  }
}

describe('createEmptyClientForm', () => {
  it('returns an object with all fields as empty strings', () => {
    expect(createEmptyClientForm()).toEqual({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      heightCm: '',
      dietaryNotes: '',
      notes: '',
    })
  })
})

describe('clientToForm', () => {
  it('converts a full client to string form fields', () => {
    const form = clientToForm(clientData())
    expect(form.name).toBe('María García')
    expect(form.heightCm).toBe('168')
    expect(form.birthDate).toBe('1990-05-12')
    expect(form.dietaryNotes).toBe('Sin lactosa')
  })

  it('converts null fields to empty strings', () => {
    const form = clientToForm(clientData({ email: null, heightCm: null, notes: null }))
    expect(form.email).toBe('')
    expect(form.heightCm).toBe('')
    expect(form.notes).toBe('')
  })
})

describe('formToClientData', () => {
  it('converts empty strings to null', () => {
    const data = formToClientData(createEmptyClientForm())
    expect(data.email).toBeNull()
    expect(data.phone).toBeNull()
    expect(data.birthDate).toBeNull()
    expect(data.heightCm).toBeNull()
    expect(data.dietaryNotes).toBeNull()
    expect(data.notes).toBeNull()
  })

  it('converts heightCm to a number', () => {
    const form = { ...createEmptyClientForm(), name: 'Ana', heightCm: '170' }
    expect(formToClientData(form).heightCm).toBe(170)
  })

  it('trims text fields', () => {
    const form = { ...createEmptyClientForm(), name: '  Ana  ', email: ' a@b.com ' }
    const data = formToClientData(form)
    expect(data.name).toBe('Ana')
    expect(data.email).toBe('a@b.com')
  })
})

describe('round-trip: clientToForm → formToClientData', () => {
  it('preserves a full client', () => {
    const original = clientData()
    const roundTrip = formToClientData(clientToForm(original))
    expect(roundTrip).toEqual(original)
  })

  it('preserves a minimal client (nulls)', () => {
    const original = clientData({
      email: null, phone: null, birthDate: null, heightCm: null, dietaryNotes: null, notes: null,
    })
    const roundTrip = formToClientData(clientToForm(original))
    expect(roundTrip).toEqual(original)
  })
})
