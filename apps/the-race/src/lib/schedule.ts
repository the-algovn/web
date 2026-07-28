// Fitting the commentary to the clock.
//
// The server writes each line at the moment it *wants* it spoken, without
// knowing how long any of them take to say — durations only exist once the
// clips are decoded, in the browser. So the schedule is finalized here, at
// preload, from measured durations.
//
// This is deterministic: the same lines and the same durations always produce
// the same schedule, so two people watching the same race hear the same thing.

import type { Line } from "./types"

/** A line that failed to synthesize has no clip and takes no time. */
export const NO_AUDIO = 0

export interface ScheduledLine extends Line {
  /**
   * Position in the original line array. Load-bearing: scheduling sorts and can
   * drop lines, so a scheduled line's position no longer matches its clip's.
   * Look audio up by this, never by the scheduled index.
   */
  index: number
  /** When it is actually spoken, after collision resolution. */
  startMs: number
  /** Measured clip length; 0 when the line is a caption with no audio. */
  durationMs: number
  /** True when the line was pushed later than the server intended. */
  nudged: boolean
}

export interface ScheduleResult {
  lines: ScheduledLine[]
  /** Lines dropped because they could not be fitted. */
  dropped: Line[]
}

/**
 * schedule lays the commentary out so no two lines overlap.
 *
 * Rules, in order of precedence:
 *  1. The finish call is pinned. It is the one line whose timing carries
 *     meaning — it lands with the winner crossing — so it never moves, and it
 *     wins every collision.
 *  2. A line that would start before the previous one finishes is pushed later.
 *  3. A line that still cannot fit before the finish call is dropped, lowest
 *     intensity first, because dropping filler is better than talking over the
 *     result.
 */
export function schedule(
  lines: Line[],
  durationOf: (line: Line, index: number) => number,
): ScheduleResult {
  if (lines.length === 0) return { lines: [], dropped: [] }

  // Keep each line's original position before sorting — it is how audio is
  // matched back to the line once dropping has shifted everything.
  const ordered = lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => a.line.atMs - b.line.atMs)

  const finishIndex = ordered.length - 1
  const finishEntry0 = ordered[finishIndex]
  if (!finishEntry0) return { lines: [], dropped: [] }
  const finish = finishEntry0.line

  const withDuration = ordered.map(({ line, index }) => ({
    line,
    index,
    durationMs: Math.max(0, durationOf(line, index)),
  }))

  const finishEntry = withDuration[finishIndex]
  const finishDuration = finishEntry ? finishEntry.durationMs : NO_AUDIO

  const placed: ScheduledLine[] = []
  const dropped: Line[] = []
  let freeAt = 0

  for (let i = 0; i < finishIndex; i++) {
    const entry = withDuration[i]
    if (!entry) continue

    const startMs = Math.max(entry.line.atMs, freeAt)
    // Anything that would still be talking when the finish call lands has to go.
    if (startMs + entry.durationMs > finish.atMs) {
      dropped.push(entry.line)
      continue
    }
    placed.push({
      ...entry.line,
      index: entry.index,
      startMs,
      durationMs: entry.durationMs,
      nudged: startMs !== entry.line.atMs,
    })
    freeAt = startMs + entry.durationMs
  }

  // The finish call, pinned, always last.
  placed.push({
    ...finish,
    index: finishEntry0.index,
    startMs: finish.atMs,
    durationMs: finishDuration,
    nudged: false,
  })

  return { lines: placed, dropped }
}

/** The line that should be on screen at tMs, or null for silence. */
export function scheduledLineAt(
  lines: ScheduledLine[],
  tMs: number,
  holdMs: number,
): ScheduledLine | null {
  let current: ScheduledLine | null = null
  for (const line of lines) {
    if (line.startMs > tMs) break
    current = line
  }
  if (!current) return null
  // A voiced line shows for as long as it is speaking; a silent one gets the
  // fixed caption hold, since there is no audio to time it against.
  const visibleFor = Math.max(current.durationMs, holdMs)
  return tMs - current.startMs <= visibleFor ? current : null
}
