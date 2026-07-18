// A click counts toward the live clicks/sec readout while it is younger than
// the window. Pure so the App can keep an array in a ref and prune it on a tick.
const WINDOW_MS = 1000

export function pruneRecent(timestamps: number[], nowMs: number, windowMs = WINDOW_MS): number[] {
  return timestamps.filter((t) => nowMs - t < windowMs)
}

export function countRecent(timestamps: number[], nowMs: number, windowMs = WINDOW_MS): number {
  return pruneRecent(timestamps, nowMs, windowMs).length
}
