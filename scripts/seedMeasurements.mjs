// One-off dev script: seeds random (but trending) measurements for a client
// so the /progreso/:clientId page has data to validate against.
//
// Usage:
//   ADMIN_EMAIL=you@example.com node scripts/seedMeasurements.mjs <clientId> [count]
//
// Requires ADMIN_PASS in .env.local (or env) for the matching account, since
// Firestore rules only allow measurement writes from an authenticated owner.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { MEASUREMENT_METRICS } from '../src/models/measurementMetrics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const path = join(__dirname, '..', '.env.local')
  const content = readFileSync(path, 'utf-8')
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const key = match[1]
    let value = (match[2] ?? '').trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Direction of the per-measurement drift for each metric, layered on top of
// small random noise so the progress charts show a believable trend.
const TREND_PER_STEP = {
  weightKg: -0.4,
  bodyFatPct: -0.25,
  musclePct: 0.15,
  waterPct: 0.1,
  visceralFat: -0.1,
  metabolicAge: -0.2,
  waistCm: -0.3,
  hipCm: -0.2,
  armLeftCm: 0.05,
  armRightCm: 0.06,
  thighLeftCm: -0.05,
  thighRightCm: -0.04,
}

function randomBaseline(metric) {
  const span = metric.max - metric.min
  const low = metric.min + span * 0.35
  const high = metric.min + span * 0.55
  return randomBetween(low, high)
}

function buildMeasurements(clientId, count) {
  const today = new Date()
  const baselines = {}
  for (const metric of MEASUREMENT_METRICS) {
    baselines[metric.key] = randomBaseline(metric)
  }

  const measurements = []
  for (let i = 0; i < count; i++) {
    const measuredAt = new Date(today)
    measuredAt.setDate(measuredAt.getDate() - (count - 1 - i) * 14)

    const data = { measuredAt: measuredAt.toISOString().slice(0, 10) }
    for (const metric of MEASUREMENT_METRICS) {
      const trend = TREND_PER_STEP[metric.key] ?? 0
      const noise = randomBetween(-1, 1) * (metric.max - metric.min) * 0.015
      const raw = baselines[metric.key] + trend * i + noise
      const clamped = clamp(raw, metric.min, metric.max)
      data[metric.key] = metric.integer ? Math.round(clamped) : roundTo(clamped, metric.decimals)
    }

    measurements.push(data)
  }
  return measurements
}

async function main() {
  const [clientId, countArg] = process.argv.slice(2)
  if (!clientId) {
    console.error('Usage: node scripts/seedMeasurements.mjs <clientId> [count]')
    process.exit(1)
  }
  const count = countArg ? Number(countArg) : 8
  if (!Number.isInteger(count) || count < 1) {
    console.error('count must be a positive integer')
    process.exit(1)
  }

  loadEnvLocal()

  const { ADMIN_EMAIL, ADMIN_PASS } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASS (env or .env.local) — an authenticated owner is required to write measurements.')
    process.exit(1)
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  const { user } = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS)

  const measurements = buildMeasurements(clientId, count)
  const measurementsRef = collection(db, 'clients', clientId, 'measurements')

  for (const data of measurements) {
    await addDoc(measurementsRef, { ...data, uid: user.uid, createdAt: serverTimestamp() })
    console.log(`Created measurement for ${data.measuredAt}`)
  }

  console.log(`Done. Seeded ${measurements.length} measurements for client ${clientId}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
