/**
 * Validation utilities for Firestore data.
 * Each function returns { valid: true } or { valid: false, message: string }.
 * Messages are user-facing (Spanish).
 */

import { getRepsSubcase } from '../models/blockTypes'
import { MEASUREMENT_METRICS } from '../models/measurementMetrics'

export const CHAR_LIMITS = {
  blockName: 50,
  exerciseName: 30,
  exerciseNotes: 30,
  clientName: 50,
  clientNotes: 500,
  measurementNotes: 200,
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidDateString(value) {
  return DATE_REGEX.test(value) && !isNaN(new Date(value).getTime())
}

export function validateBlock(blockData) {
  if (!blockData.name?.trim()) {
    return { valid: false, message: 'El bloque debe tener un nombre.' }
  }
  if (blockData.name.length > CHAR_LIMITS.blockName) {
    return { valid: false, message: `El nombre del bloque no puede superar ${CHAR_LIMITS.blockName} caracteres.` }
  }

  if (!blockData.type || !['timed', 'reps'].includes(blockData.type)) {
    return { valid: false, message: 'El tipo de bloque debe ser "timed" o "reps".' }
  }

  if (!blockData.exercises?.length || !blockData.exercises.some((ex) => ex.name?.trim())) {
    return { valid: false, message: 'El bloque debe tener al menos un ejercicio con nombre.' }
  }
  for (const ex of blockData.exercises) {
    if (ex.name && ex.name.length > CHAR_LIMITS.exerciseName) {
      return { valid: false, message: `El nombre del ejercicio "${ex.name.slice(0, 15)}…" supera ${CHAR_LIMITS.exerciseName} caracteres.` }
    }
    if (ex.notes && ex.notes.length > CHAR_LIMITS.exerciseNotes) {
      return { valid: false, message: `Las notas de "${ex.name || 'ejercicio'}" superan ${CHAR_LIMITS.exerciseNotes} caracteres.` }
    }
  }

  if (blockData.type === 'timed') {
    if (blockData.subtype === 'intervals') {
      if (!blockData.workSecondsPerRound?.length) {
        return { valid: false, message: 'Debes añadir al menos una ronda con tiempo.' }
      }
      if (blockData.workSecondsPerRound.some((s) => !Number.isFinite(s) || s <= 0)) {
        return { valid: false, message: 'Todos los tiempos por ronda deben ser mayores a 0.' }
      }
    }
    if (!blockData.workSeconds || blockData.workSeconds <= 0) {
      return { valid: false, message: 'El tiempo de trabajo debe ser mayor a 0.' }
    }
    if (!blockData.rounds || blockData.rounds < 1) {
      return { valid: false, message: 'El bloque debe tener al menos 1 ronda.' }
    }
    if (blockData.restSeconds != null && blockData.restSeconds < 0) {
      return { valid: false, message: 'El tiempo de descanso no puede ser negativo.' }
    }
    if (!blockData.exerciseMode || !['all', 'rotate'].includes(blockData.exerciseMode)) {
      return { valid: false, message: 'El modo de ejercicios debe ser "all" o "rotate".' }
    }
    if (
      ['amrap', 'emom'].includes(blockData.subtype) &&
      blockData.exercises.some((ex) => !ex.repsEveryRound)
    ) {
      return {
        valid: false,
        message: `Cada ejercicio debe tener repeticiones en ${blockData.subtype.toUpperCase()}.`,
      }
    }
  }

  if (blockData.type === 'reps') {
    if (!blockData.rounds || blockData.rounds < 1) {
      return { valid: false, message: 'El bloque debe tener al menos 1 ronda.' }
    }
    const subcase = getRepsSubcase(blockData)
    if (subcase === 'sameReps' && (!blockData.repsEveryRound || blockData.repsEveryRound < 1)) {
      return { valid: false, message: 'Las repeticiones por ronda deben ser mayor a 0.' }
    }
    if (subcase === 'perRound') {
      if (!blockData.repsPerRound?.length) {
        return { valid: false, message: 'Debes añadir al menos una ronda con repeticiones.' }
      }
      if (blockData.repsPerRound.some((r) => !Number.isFinite(r) || r < 1)) {
        return {
          valid: false,
          message: 'Todas las repeticiones por ronda deben ser números positivos.',
        }
      }
    }
    if (
      subcase === 'perExercise' &&
      blockData.exercises.some((ex) => !ex.repsEveryRound || ex.repsEveryRound < 1)
    ) {
      return { valid: false, message: 'Cada ejercicio debe tener repeticiones.' }
    }
  }

  return { valid: true }
}

export function validateClient(clientData) {
  if (!clientData.name?.trim()) {
    return { valid: false, message: 'El cliente debe tener un nombre.' }
  }
  if (clientData.name.length > CHAR_LIMITS.clientName) {
    return { valid: false, message: `El nombre del cliente no puede superar ${CHAR_LIMITS.clientName} caracteres.` }
  }
  if (clientData.email && !EMAIL_REGEX.test(clientData.email)) {
    return { valid: false, message: 'El email no es válido.' }
  }
  if (clientData.birthDate && !isValidDateString(clientData.birthDate)) {
    return { valid: false, message: 'La fecha de nacimiento no es válida.' }
  }
  if (clientData.heightCm != null && (clientData.heightCm < 50 || clientData.heightCm > 250)) {
    return { valid: false, message: 'La altura debe estar entre 50 y 250 cm.' }
  }
  if (clientData.dietaryNotes && clientData.dietaryNotes.length > CHAR_LIMITS.clientNotes) {
    return { valid: false, message: `Las notas alimenticias no pueden superar ${CHAR_LIMITS.clientNotes} caracteres.` }
  }
  if (clientData.notes && clientData.notes.length > CHAR_LIMITS.clientNotes) {
    return { valid: false, message: `Las notas no pueden superar ${CHAR_LIMITS.clientNotes} caracteres.` }
  }
  return { valid: true }
}

export function validateMeasurement(measurementData) {
  if (!measurementData.measuredAt) {
    return { valid: false, message: 'La medición debe tener una fecha.' }
  }
  if (!isValidDateString(measurementData.measuredAt)) {
    return { valid: false, message: 'La fecha de la medición no es válida.' }
  }

  const hasAnyMetric = MEASUREMENT_METRICS.some((m) => measurementData[m.key] != null)
  if (!hasAnyMetric) {
    return { valid: false, message: 'Debes rellenar al menos una medida.' }
  }

  for (const metric of MEASUREMENT_METRICS) {
    const value = measurementData[metric.key]
    if (value == null) continue
    if (!Number.isFinite(value) || value < metric.min || value > metric.max) {
      return { valid: false, message: `${metric.label} debe estar entre ${metric.min} y ${metric.max}.` }
    }
    if (metric.integer && !Number.isInteger(value)) {
      return { valid: false, message: `${metric.label} debe ser un número entero.` }
    }
  }

  if (measurementData.notes && measurementData.notes.length > CHAR_LIMITS.measurementNotes) {
    return { valid: false, message: `Las notas no pueden superar ${CHAR_LIMITS.measurementNotes} caracteres.` }
  }

  return { valid: true }
}

export function validateClass(classData) {
  if (!classData.name?.trim()) {
    return { valid: false, message: 'La clase debe tener un nombre.' }
  }

  if (!classData.blocks?.length) {
    return { valid: false, message: 'La clase debe tener al menos un bloque.' }
  }

  for (let i = 0; i < classData.blocks.length; i++) {
    const block = classData.blocks[i]
    if (!block.blockData) {
      return { valid: false, message: `El bloque ${i + 1} no tiene datos.` }
    }
    const blockResult = validateBlock(block.blockData)
    if (!blockResult.valid) {
      return {
        valid: false,
        message: `Bloque "${block.blockData.name || i + 1}": ${blockResult.message}`,
      }
    }
  }

  return { valid: true }
}

export function validateSessionInputs(classData, screenId) {
  if (!classData) {
    return { valid: false, message: 'No se encontró la clase para iniciar la sesión.' }
  }
  if (!classData.id) {
    return { valid: false, message: 'La clase no tiene un ID válido.' }
  }
  if (!classData.blocks?.length) {
    return { valid: false, message: 'La clase no tiene bloques.' }
  }
  if (!screenId) {
    return { valid: false, message: 'Debes seleccionar una pantalla.' }
  }
  return { valid: true }
}
