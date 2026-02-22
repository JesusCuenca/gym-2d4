/**
 * Converts a Firestore Timestamp or plain {seconds, nanoseconds} object to milliseconds.
 * Handles both Firestore SDK Timestamp instances and raw data from snapshots.
 */
export function timestampToMillis(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}
