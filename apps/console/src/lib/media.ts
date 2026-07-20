export const PAGE_SIZE = 20

export interface Track {
  ytId?: string
  title?: string
  channel?: string
  durationS?: string | number
  artifactId?: string
  inputI?: number
  inputTp?: number
  inputLra?: number
  addedAt?: string
}

// int64 seconds (may arrive as a JSON string, hence Number() at call sites)
// → "m:ss". Guards NaN/negative so the transport never shows "NaN:NaN".
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
}
