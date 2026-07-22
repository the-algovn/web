import type { NowPlaying } from "./radio-client"

export interface Progress {
  elapsedS: number
  remainingS: number
  fraction: number
}

// Driven by the ear-sync playhead, not wall clock, so the bar matches what
// the listener actually hears. It freezes when paused because the playhead
// stops advancing, and runs on wall clock before first play because the
// station is on air whether or not anyone is listening.
export function progressOf(np: NowPlaying, nowMs: number): Progress {
  const duration = Math.max(0, np.durationSeconds)
  const startedMs = Date.parse(np.startedAt)
  if (duration === 0 || Number.isNaN(startedMs)) {
    return { elapsedS: 0, remainingS: duration, fraction: 0 }
  }
  const elapsedS = Math.min(duration, Math.max(0, (nowMs - startedMs) / 1000))
  return {
    elapsedS,
    remainingS: duration - elapsedS,
    fraction: elapsedS / duration,
  }
}
