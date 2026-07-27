/**
 * Measurement form <-> Firestore data mapping (mirror of blockForm.js).
 * Metric inputs are strings; '' → null, comma decimals ('78,4') are normalized.
 */

import { MEASUREMENT_METRICS } from '../models/measurementMetrics'

function todayString() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function createEmptyMeasurementForm() {
  const form = { measuredAt: todayString(), notes: '' }
  for (const metric of MEASUREMENT_METRICS) {
    form[metric.key] = ''
  }
  return form
}

export function measurementToForm(measurement) {
  const form = {
    measuredAt: measurement.measuredAt || todayString(),
    notes: measurement.notes || '',
  }
  for (const metric of MEASUREMENT_METRICS) {
    const value = measurement[metric.key]
    form[metric.key] = value != null ? String(value).replace('.', ',') : ''
  }
  return form
}

export function formToMeasurementData(form) {
  const data = {
    measuredAt: form.measuredAt,
    notes: form.notes.trim() || null,
  }
  for (const metric of MEASUREMENT_METRICS) {
    const raw = String(form[metric.key] ?? '').trim().replace(',', '.')
    data[metric.key] = raw !== '' && !isNaN(Number(raw)) ? Number(raw) : null
  }
  return data
}
