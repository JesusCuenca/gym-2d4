export const BLOCK_FAMILY = {
  TIME_BASED: 'timeBased',
  REP_BASED: 'repBased',
}

export const BLOCK_TYPES = [
  { value: 'amrap', label: 'AMRAP', family: BLOCK_FAMILY.TIME_BASED },
  { value: 'emom', label: 'EMOM', family: BLOCK_FAMILY.TIME_BASED },
  { value: 'tabata', label: 'Tabata', family: BLOCK_FAMILY.TIME_BASED },
  { value: 'forTime', label: 'For Time', family: BLOCK_FAMILY.REP_BASED },
  { value: 'strength', label: 'Strength', family: BLOCK_FAMILY.REP_BASED },
  { value: 'customTime', label: 'Custom (Time)', family: BLOCK_FAMILY.TIME_BASED },
  { value: 'customReps', label: 'Custom (Reps)', family: BLOCK_FAMILY.REP_BASED },
]

export function getFamilyForType(type) {
  return BLOCK_TYPES.find((bt) => bt.value === type)?.family ?? BLOCK_FAMILY.TIME_BASED
}

export function isTimeBased(type) {
  return getFamilyForType(type) === BLOCK_FAMILY.TIME_BASED
}
