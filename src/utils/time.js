export function timeStringToSeconds(str) {
  if (!str || typeof str !== 'string') return 0
  const [m, s] = str.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

export function formatTimer(totalSeconds) {
  const abs = Math.max(0, Math.floor(isFinite(totalSeconds) ? totalSeconds : 0))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Alias kept for backwards compatibility (identical to formatTimer)
export const secondsToTimeString = formatTimer

export function formatTimerTwoLine(totalSeconds) {
  const abs = Math.max(0, Math.floor(isFinite(totalSeconds) ? totalSeconds : 0))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  const secStr = ':' + String(s).padStart(2, '0')
  return abs >= 100 ? { minutes: String(m), seconds: secStr } : { minutes: null, seconds: secStr }
}
