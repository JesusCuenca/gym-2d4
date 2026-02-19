/**
 * Validation utilities for Firestore data.
 * Each function returns { valid: true } or { valid: false, message: string }.
 * Messages are user-facing (Spanish).
 */

import { getRepsSubcase } from '../models/blockTypes'

export function validateBlock(blockData) {
  if (!blockData.name?.trim()) {
    return { valid: false, message: 'El bloque debe tener un nombre.' }
  }

  if (!blockData.type || !['timed', 'reps'].includes(blockData.type)) {
    return { valid: false, message: 'El tipo de bloque debe ser "timed" o "reps".' }
  }

  if (!blockData.exercises?.length || !blockData.exercises.some((ex) => ex.name?.trim())) {
    return { valid: false, message: 'El bloque debe tener al menos un ejercicio con nombre.' }
  }

  if (blockData.type === 'timed') {
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
