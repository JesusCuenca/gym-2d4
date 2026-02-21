import { describe, it, expect } from 'vitest'
import { buildTimeline, getTotalDuration } from '../timeline'

// Helpers
function timedBlock(overrides) {
  return {
    type: 'timed',
    rounds: 1,
    workSeconds: 60,
    restSeconds: 0,
    exerciseMode: 'all',
    exercises: [{ name: 'Squat' }, { name: 'Push-up' }],
    ...overrides,
  }
}

describe('buildTimeline — mode "all"', () => {
  it('single round, no rest', () => {
    const tl = buildTimeline(timedBlock())
    expect(tl).toHaveLength(1)
    expect(tl[0]).toEqual({ startAt: 0, duration: 60, phase: 'work', round: 1, exerciseIndex: null })
  })

  it('multiple rounds with rest, no rest after last round', () => {
    const tl = buildTimeline(timedBlock({ rounds: 3, restSeconds: 30 }))
    // work, rest, work, rest, work (no rest at end)
    expect(tl).toHaveLength(5)
    expect(tl.map((s) => s.phase)).toEqual(['work', 'rest', 'work', 'rest', 'work'])
    expect(tl[4].phase).toBe('work') // last segment has no rest
  })

  it('all segments have exerciseIndex: null', () => {
    const tl = buildTimeline(timedBlock({ rounds: 2, restSeconds: 15 }))
    expect(tl.every((s) => s.exerciseIndex === null)).toBe(true)
  })

  it('restSeconds: 0 generates no rest segments', () => {
    const tl = buildTimeline(timedBlock({ rounds: 4, restSeconds: 0 }))
    expect(tl.every((s) => s.phase === 'work')).toBe(true)
    expect(tl).toHaveLength(4)
  })

  it('segments are contiguous (each startAt equals previous startAt + duration)', () => {
    const tl = buildTimeline(timedBlock({ rounds: 3, restSeconds: 30 }))
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].startAt).toBe(tl[i - 1].startAt + tl[i - 1].duration)
    }
  })

  it('sum of durations equals total duration', () => {
    const block = timedBlock({ rounds: 3, restSeconds: 30 })
    const tl = buildTimeline(block)
    const sum = tl.reduce((acc, s) => acc + s.duration, 0)
    expect(sum).toBe(getTotalDuration(block))
  })
})

describe('buildTimeline — mode "rotate"', () => {
  const rotateBlock = timedBlock({
    exerciseMode: 'rotate',
    workSeconds: 20,
    restSeconds: 10,
    exercises: [{ name: 'A' }, { name: 'B' }],
  })

  it('single round, 2 exercises: work, rest, work (no rest after last)', () => {
    const tl = buildTimeline(rotateBlock)
    expect(tl).toHaveLength(3)
    expect(tl.map((s) => s.phase)).toEqual(['work', 'rest', 'work'])
    expect(tl.map((s) => s.exerciseIndex)).toEqual([0, 0, 1])
  })

  it('exerciseIndex cycles through exercises', () => {
    const block = timedBlock({
      exerciseMode: 'rotate',
      rounds: 2,
      exercises: [{ name: 'A' }, { name: 'B' }],
      restSeconds: 10,
    })
    const tl = buildTimeline(block)
    const workSegments = tl.filter((s) => s.phase === 'work')
    expect(workSegments.map((s) => s.exerciseIndex)).toEqual([0, 1, 0, 1])
  })

  it('no rest after last exercise of last round', () => {
    const tl = buildTimeline(timedBlock({
      exerciseMode: 'rotate',
      rounds: 2,
      exercises: [{ name: 'A' }, { name: 'B' }],
      restSeconds: 10,
    }))
    expect(tl.at(-1).phase).toBe('work')
    expect(tl.at(-1).exerciseIndex).toBe(1)
  })

  it('single exercise rotates correctly', () => {
    const tl = buildTimeline(timedBlock({
      exerciseMode: 'rotate',
      rounds: 3,
      exercises: [{ name: 'A' }],
      restSeconds: 10,
    }))
    // Single exercise: work, rest, work, rest, work (last has no rest)
    expect(tl).toHaveLength(5)
    expect(tl.map((s) => s.exerciseIndex)).toEqual([0, 0, 0, 0, 0])
  })

  it('Tabata: 8 rounds x 2 exercises = 31 segments', () => {
    const tabata = timedBlock({
      exerciseMode: 'rotate',
      rounds: 8,
      workSeconds: 20,
      restSeconds: 10,
      exercises: [{ name: 'A' }, { name: 'B' }],
    })
    const tl = buildTimeline(tabata)
    expect(tl).toHaveLength(31)
  })

  it('Tabata total duration matches getTotalDuration', () => {
    const tabata = timedBlock({
      exerciseMode: 'rotate',
      rounds: 8,
      workSeconds: 20,
      restSeconds: 10,
      exercises: [{ name: 'A' }, { name: 'B' }],
    })
    const tl = buildTimeline(tabata)
    const sum = tl.reduce((acc, s) => acc + s.duration, 0)
    expect(sum).toBe(getTotalDuration(tabata))
    expect(sum).toBe(470)
  })
})

describe('buildTimeline — edge cases', () => {
  it('returns null for reps blocks', () => {
    expect(buildTimeline({ type: 'reps', exercises: [{ name: 'A' }], rounds: 3 })).toBeNull()
  })

  it('returns [] for empty exercises', () => {
    expect(buildTimeline(timedBlock({ exercises: [] }))).toEqual([])
  })

  it('returns [] for rounds = 0', () => {
    expect(buildTimeline(timedBlock({ rounds: 0 }))).toEqual([])
  })

  it('returns [] for workSeconds = 0', () => {
    expect(buildTimeline(timedBlock({ workSeconds: 0 }))).toEqual([])
  })
})

describe('getTotalDuration', () => {
  it('returns null for reps blocks', () => {
    expect(getTotalDuration({ type: 'reps' })).toBeNull()
  })

  it('mode "all": matches sum of buildTimeline durations', () => {
    const block = timedBlock({ rounds: 4, restSeconds: 20 })
    const tl = buildTimeline(block)
    const sum = tl.reduce((acc, s) => acc + s.duration, 0)
    expect(getTotalDuration(block)).toBe(sum)
  })

  it('mode "rotate": matches sum of buildTimeline durations', () => {
    const block = timedBlock({
      exerciseMode: 'rotate',
      rounds: 3,
      workSeconds: 30,
      restSeconds: 15,
      exercises: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    })
    const tl = buildTimeline(block)
    const sum = tl.reduce((acc, s) => acc + s.duration, 0)
    expect(getTotalDuration(block)).toBe(sum)
  })

  it('restSeconds = 0: no rest time added', () => {
    const block = timedBlock({ rounds: 5, restSeconds: 0 })
    expect(getTotalDuration(block)).toBe(5 * 60)
  })
})
