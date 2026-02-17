import { ref, watch, onUnmounted } from 'vue'

export function useTimer(sessionRef) {
  const displaySeconds = ref(0)
  let rafId = null

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

  return { displaySeconds }
}
