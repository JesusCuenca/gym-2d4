/**
 * Builds a flat array of timeline segments for a timed block.
 * Each segment represents a work or rest phase with its start time, duration, round, and exercise index.
 * The TV uses this to determine what to display at any given elapsed time.
 */
export function buildTimeline(block) {
  if (block.type !== 'timed') return null
  if (!block.exercises?.length) return []
  if (!block.rounds || block.rounds < 1) return []
  if (!block.workSeconds || block.workSeconds <= 0) return []

  const segments = []
  let cursor = 0

  for (let round = 1; round <= block.rounds; round++) {
    const isLastRound = round === block.rounds

    if (block.exerciseMode === 'rotate') {
      for (let i = 0; i < block.exercises.length; i++) {
        const isLastExercise = isLastRound && i === block.exercises.length - 1
        segments.push({ startAt: cursor, duration: block.workSeconds, phase: 'work', round, exerciseIndex: i })
        cursor += block.workSeconds
        if (block.restSeconds > 0 && !isLastExercise) {
          segments.push({ startAt: cursor, duration: block.restSeconds, phase: 'rest', round, exerciseIndex: i })
          cursor += block.restSeconds
        }
      }
    } else {
      segments.push({ startAt: cursor, duration: block.workSeconds, phase: 'work', round, exerciseIndex: null })
      cursor += block.workSeconds
      if (block.restSeconds > 0 && !isLastRound) {
        segments.push({ startAt: cursor, duration: block.restSeconds, phase: 'rest', round, exerciseIndex: null })
        cursor += block.restSeconds
      }
    }
  }

  return segments
}

/**
 * Returns the total duration in seconds for a timed block, or null for reps blocks.
 */
export function getTotalDuration(block) {
  if (block.type !== 'timed') return null
  const exCount = block.exercises?.length || 1
  if (block.exerciseMode === 'rotate') {
    const totalIterations = block.rounds * exCount
    return totalIterations * block.workSeconds + (totalIterations - 1) * block.restSeconds
  }
  return block.rounds * block.workSeconds + (block.rounds - 1) * block.restSeconds
}
