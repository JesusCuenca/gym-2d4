import { ref, computed, watch, onUnmounted, reactive } from 'vue'
import { buildTimeline } from '../utils/timeline'
import { timestampToMillis } from '../utils/firestore'

export function useTimer(sessionRef) {
  const displaySeconds = ref(0)
  let rafId = null

  // --- rAF loop (unchanged logic) ---

  function tick() {
    const s = sessionRef.value
    if (!s || (s.clockState !== 'running' && s.clockState !== 'countdown') || !s.startTimestamp) {
      return
    }

    const startMs = timestampToMillis(s.startTimestamp)
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
      if (state === 'running' || state === 'countdown') {
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

  // Sync displaySeconds when accumulatedTime changes while clock is not ticking
  // (e.g. trainer adjusts time while paused)
  watch(
    () => sessionRef.value?.accumulatedTime,
    (newAcc) => {
      const s = sessionRef.value
      if (!s || newAcc == null) return
      if (s.clockState !== 'running' && s.clockState !== 'countdown') {
        displaySeconds.value = newAcc
      }
    },
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

  // Binary search: find the last segment whose startAt <= displaySeconds.
  // Returns { segment, index } or { segment: null, index: -1 }.
  function findCurrentSegment(tl, elapsed) {
    let lo = 0
    let hi = tl.length - 1
    let resultIdx = -1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (tl[mid].startAt <= elapsed) {
        resultIdx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return resultIdx === -1
      ? { segment: null, index: -1 }
      : { segment: tl[resultIdx], index: resultIdx }
  }

  const currentSegmentResult = computed(() => {
    if (!timeline.value) return { segment: null, index: -1 }
    return findCurrentSegment(timeline.value, displaySeconds.value)
  })

  const currentSegment = computed(() => currentSegmentResult.value.segment)

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
    const { segment, index } = currentSegmentResult.value
    if (!timeline.value || !segment) return null
    // Search forward from current index without creating a new array
    for (let i = index + 1; i < timeline.value.length; i++) {
      const seg = timeline.value[i]
      if (seg.phase === 'work' && seg.exerciseIndex != null) {
        return currentBlock.value?.exercises?.[seg.exerciseIndex]?.name ?? null
      }
    }
    return null
  })

  const isBlockFinished = computed(() => {
    if (!timeline.value) return false
    const last = timeline.value.at(-1)
    return last ? displaySeconds.value >= last.startAt + last.duration : false
  })

  const isCountingDown = computed(() => sessionRef.value?.clockState === 'countdown')
  const countdownSecondsLeft = computed(() => {
    if (!isCountingDown.value) return null
    const left = Math.ceil(3 - displaySeconds.value)
    return left > 0 ? left : null
  })

  // Self-healing: countdown is stuck if >5s have elapsed without transitioning to running
  const COUNTDOWN_STUCK_THRESHOLD = 5
  const isCountdownStuck = computed(() => {
    if (!isCountingDown.value) return false
    return displaySeconds.value > COUNTDOWN_STUCK_THRESHOLD
  })

  return reactive({
    displaySeconds,
    currentSegment,
    phaseSecondsLeft,
    isResting,
    currentRound,
    totalRounds,
    currentExerciseIndex,
    nextExerciseName,
    isBlockFinished,
    isCountingDown,
    countdownSecondsLeft,
    isCountdownStuck,
  })
}
