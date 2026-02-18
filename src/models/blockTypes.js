export const BLOCK_TYPES = [
  { value: 'timed', label: 'Por tiempo' },
  { value: 'reps', label: 'Por repeticiones' },
]

export const TIMED_PRESETS = [
  { value: 'amrap', label: 'AMRAP', defaults: { rounds: 1, restSeconds: 0, exerciseMode: 'all' } },
  { value: 'emom', label: 'EMOM', defaults: { restSeconds: 0, exerciseMode: 'all' } },
  { value: 'tabata', label: 'Tabata', defaults: { workSeconds: 20, restSeconds: 10, exerciseMode: 'rotate' } },
]

export function isTimed(type) {
  return type === 'timed'
}

export function getBlockLabel(block) {
  if (block.type === 'timed' && block.preset) {
    const preset = TIMED_PRESETS.find((p) => p.value === block.preset)
    if (preset) return preset.label
  }
  return BLOCK_TYPES.find((bt) => bt.value === block.type)?.label ?? block.type
}

export function getRepsSubcase(block) {
  if (block.repsPerRound?.length) return 'perRound'
  if (block.repsEveryRound != null) return 'sameReps'
  return 'perExercise'
}
