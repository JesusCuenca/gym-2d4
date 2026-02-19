export const BLOCK_TYPES = [
  { value: 'timed', label: 'Por tiempo' },
  { value: 'reps', label: 'Por repeticiones' },
]

export const TIMED_SUBTYPES = [
  { value: 'custom', label: 'Personalizada' },
  { value: 'amrap', label: 'AMRAP', defaults: { rounds: 1, restSeconds: 0, exerciseMode: 'all' } },
  { value: 'emom', label: 'EMOM', defaults: { restSeconds: 0, exerciseMode: 'all' } },
  { value: 'tabata', label: 'Tabata', defaults: { workSeconds: 20, restSeconds: 10, exerciseMode: 'rotate' } },
]

export const REPS_SUBTYPES = [
  { value: 'sameReps', label: 'Mismas reps cada ronda' },
  { value: 'perRound', label: 'Reps variables (ej. 21-15-9)' },
  { value: 'perExercise', label: 'Reps por ejercicio' },
]

export function isTimed(type) {
  return type === 'timed'
}

export function getBlockLabel(block) {
  if (block.type === 'timed' && block.subtype) {
    const subtype = TIMED_SUBTYPES.find((p) => p.value === block.subtype)
    if (subtype) return subtype.label
  }
  return BLOCK_TYPES.find((bt) => bt.value === block.type)?.label ?? block.type
}

export function getRepsSubcase(block) {
  if (block.subtype) return block.subtype
  if (block.repsPerRound?.length) return 'perRound'
  if (block.repsEveryRound != null) return 'sameReps'
  return 'perExercise'
}
