import { ref, computed, watch, onUnmounted } from 'vue'
import { buildTimeline } from '../utils/timeline'

export function useTimer(sessionRef) {
  const displaySeconds = ref(0)
  let rafId = null

  // --- rAF loop (unchanged logic) ---

  function tick() {
    const s = sessionRef.value
    if (!s || s.clockState !== 'running' || !s.startTimestamp) {
      return
    }

    const startMs = s.startTimestamp.toMillis
      ? s.startTimestamp.toMillis()
      : s.startTimestamp.seconds * 1000
    const nowMs = Date.now()
    const elapsedSinceStart = (nowMs - startMs) / 1000
    displaySeconds.value = s.accumulatedTime + elapsedSinceStart

    rafId = requestAnimationFrame(tick)
  }

  function startTicking() {
    stopTicking()
    rafId = requestAnimationFrame(tick)
  }

  function stopTicking() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  watch(
    () => sessionRef.value?.clockState,
    (state) => {
      if (state === 'running') {
        startTicking()
      } else {
        stopTicking()
        if (sessionRef.value) {
          displaySeconds.value = sessionRef.value.accumulatedTime
        }
      }
    },
    { immediate: true },
  )

  onUnmounted(() => stopTicking())

  // --- Timeline-based computed values ---

  const currentBlock = computed(() => {
    const s = sessionRef.value
    return s?.blocks?.[s.currentBlockIndex]?.blockData ?? null
  })

  // Stable key that only changes when the block's structural data changes,
  // not on every Firestore snapshot (e.g. clockState or accumulatedTime updates).
  const timelineKey = computed(() => {
    const s = sessionRef.value
    if (!s) return null
    const b = s.blocks?.[s.currentBlockIndex]?.blockData
    if (!b || b.type !== 'timed') return null
    return `${s.currentBlockIndex}_${b.rounds}_${b.workSeconds}_${b.restSeconds}_${b.exerciseMode}_${b.exercises?.length}`
  })

  let cachedTimeline = null
  let cachedTimelineKey = null

  const timeline = computed(() => {
    const key = timelineKey.value
    if (key === null) {
      cachedTimeline = null
      cachedTimelineKey = null
      return null
    }
    if (key === cachedTimelineKey) return cachedTimeline
    cachedTimeline = buildTimeline(currentBlock.value)
    cachedTimelineKey = key
    return cachedTimeline
  })

  const currentSegment = computed(() => {
    if (!timeline.value) return null
    return timeline.value.findLast((s) => displaySeconds.value >= s.startAt) ?? null
  })

  const phaseSecondsLeft = computed(() => {
    const seg = currentSegment.value
    if (!seg) return 0
    return Math.max(0, seg.duration - (displaySeconds.value - seg.startAt))
  })

  const isResting = computed(() => currentSegment.value?.phase === 'rest')

  const currentRound = computed(() => currentSegment.value?.round ?? 1)

  const totalRounds = computed(() => currentBlock.value?.rounds ?? 1)

  const currentExerciseIndex = computed(() => currentSegment.value?.exerciseIndex ?? null)

  const nextExerciseName = computed(() => {
    if (!timeline.value || !currentSegment.value) return null
    const idx = timeline.value.indexOf(currentSegment.value)
    const nextWork = timeline.value.slice(idx + 1).find((s) => s.phase === 'work')
    if (!nextWork || nextWork.exerciseIndex == null) return null
    return currentBlock.value?.exercises?.[nextWork.exerciseIndex]?.name ?? null
  })

  const isBlockFinished = computed(() => {
    if (!timeline.value) return false
    const last = timeline.value.at(-1)
    return last ? displaySeconds.value >= last.startAt + last.duration : false
  })

  return {
    displaySeconds,
    currentSegment,
    phaseSecondsLeft,
    isResting,
    currentRound,
    totalRounds,
    currentExerciseIndex,
    nextExerciseName,
    isBlockFinished,
  }
}
