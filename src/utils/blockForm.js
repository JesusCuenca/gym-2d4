import { isTimed, getRepsSubcase } from '../models/blockTypes'

let exerciseIdCounter = 0

export function createEmptyExercise() {
  return { _id: ++exerciseIdCounter, name: '', repsEveryRound: '', notes: '' }
}

export function createEmptyForm() {
  return {
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
    exercises: [createEmptyExercise()],
  }
}

export function blockDataToForm(bd) {
  return {
    name: bd.name || '',
    type: bd.type || 'timed',
    // Backward compat: read subtype or legacy preset
    subtype: bd.type === 'reps' ? getRepsSubcase(bd) : (bd.subtype || bd.preset || 'custom'),
    workMinutes: bd.workSeconds != null ? String(Math.floor(bd.workSeconds / 60)) : '0',
    workSeconds: bd.workSeconds != null ? String(bd.workSeconds % 60).padStart(2, '0') : '00',
    restMinutes: bd.restSeconds != null ? String(Math.floor(bd.restSeconds / 60)) : '0',
    restSeconds: bd.restSeconds != null ? String(bd.restSeconds % 60).padStart(2, '0') : '00',
    rounds: bd.rounds ? String(bd.rounds) : '',
    exerciseMode: bd.exerciseMode || 'all',
    repsEveryRound: bd.repsEveryRound ? String(bd.repsEveryRound) : '',
    repsPerRound: bd.repsPerRound?.length ? bd.repsPerRound.map(String) : [''],
    exercises: (bd.exercises?.length ? bd.exercises : [{ name: '' }]).map((ex) => ({
      _id: ++exerciseIdCounter,
      name: ex.name || '',
      repsEveryRound: ex.repsEveryRound ? String(ex.repsEveryRound) : '',
      notes: ex.notes || '',
    })),
  }
}

export function formToBlockData(form) {
  const blockData = { name: form.name, type: form.type }

  if (isTimed(form.type)) {
    blockData.subtype = form.subtype === 'custom' ? null : form.subtype
    blockData.workSeconds = parseInt(form.workMinutes || 0) * 60 + parseInt(form.workSeconds || 0)
    blockData.restSeconds = form.subtype === 'amrap' ? 0 : parseInt(form.restMinutes || 0) * 60 + parseInt(form.restSeconds || 0)
    blockData.rounds = form.subtype === 'amrap' ? 1 : parseInt(form.rounds) || 1
    blockData.exerciseMode = form.exerciseMode
  } else {
    blockData.subtype = form.subtype
    if (form.subtype === 'perRound') {
      const parsed = form.repsPerRound.map((s) => parseInt(s)).filter((n) => !isNaN(n) && n > 0)
      blockData.repsPerRound = parsed.length ? parsed : null
      blockData.rounds = parsed.length || parseInt(form.rounds) || 1
      blockData.repsEveryRound = null
    } else if (form.subtype === 'sameReps') {
      blockData.repsEveryRound = form.repsEveryRound ? parseInt(form.repsEveryRound) : null
      blockData.repsPerRound = null
      blockData.rounds = parseInt(form.rounds) || 1
    } else {
      // perExercise
      blockData.repsEveryRound = null
      blockData.repsPerRound = null
      blockData.rounds = parseInt(form.rounds) || 1
    }
  }

  const showExReps = isTimed(form.type) ? form.exerciseMode === 'all' : form.subtype === 'perExercise'
  blockData.exercises = form.exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => ({
      name: ex.name,
      repsEveryRound: showExReps && ex.repsEveryRound ? parseInt(ex.repsEveryRound) : null,
      notes: ex.notes || null,
    }))

  return blockData
}
