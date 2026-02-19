import { ref } from 'vue'

let audioCtx = null

const stored = localStorage.getItem('tvAudioEnabled')
const audioEnabled = ref(stored === null ? true : stored === 'true')

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq, startDelay, duration, gainLevel = 0.3) {
  const ctx = ensureContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)

  const start = ctx.currentTime + startDelay
  const end = start + duration

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(gainLevel, start + 0.02)
  gain.gain.setValueAtTime(gainLevel, end - 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, end)

  osc.start(start)
  osc.stop(end)
}

function playWorkStart() {
  if (!audioEnabled.value) return
  playTone(660, 0, 0.15, 0.3)
  playTone(880, 0.15, 0.2, 0.3)
}

function playRestStart() {
  if (!audioEnabled.value) return
  playTone(660, 0, 0.15, 0.3)
  playTone(440, 0.15, 0.2, 0.3)
}

function playCountdown(n) {
  if (!audioEnabled.value) return
  const freq = n === 1 ? 900 : 600
  const duration = n === 1 ? 0.3 : 0.15
  playTone(freq, 0, duration, 0.25)
}

function playFinished() {
  if (!audioEnabled.value) return
  const notes = [523, 587, 659, 784, 1047]
  notes.forEach((freq, i) => {
    playTone(freq, i * 0.2, 0.25, 0.3)
  })
}

function toggleAudio() {
  ensureContext()
  audioEnabled.value = !audioEnabled.value
  localStorage.setItem('tvAudioEnabled', audioEnabled.value.toString())
}

export function useAudioCues() {
  return {
    audioEnabled,
    toggleAudio,
    playWorkStart,
    playRestStart,
    playCountdown,
    playFinished,
  }
}
