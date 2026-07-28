// Reading the authored race back out at an arbitrary instant.
//
// The server ships 20 Hz samples; the screen paints at 60. Everything the stage
// draws comes from positionsAt, so the ducks move smoothly between samples
// instead of stepping.

import type { Line, Tick } from "./types"

/** How long a commentary line stays on screen after it is called. */
export const CAPTION_HOLD_MS = 3600

/**
 * positionsAt interpolates every duck's progress at tMs. Before the first tick
 * it returns the first sample, after the last it returns the last — a race that
 * has finished keeps showing its final frame rather than snapping to nothing.
 */
export function positionsAt(ticks: Tick[], tMs: number): number[] {
  const first = ticks[0]
  const last = ticks[ticks.length - 1]
  if (!first || !last) return []
  if (ticks.length === 1 || tMs <= first.tMs) return first.positions
  if (tMs >= last.tMs) return last.positions

  // Samples are evenly spaced, so the index is arithmetic rather than a search.
  const second = ticks[1]
  const step = second ? second.tMs - first.tMs : 0
  if (step <= 0) return first.positions

  const exact = (tMs - first.tMs) / step
  const i = Math.min(Math.floor(exact), ticks.length - 2)
  const frac = exact - i

  const a = ticks[i]
  const b = ticks[i + 1]
  if (!a || !b) return first.positions
  return a.positions.map(
    (from, duck) => from + ((b.positions[duck] ?? from) - from) * frac,
  )
}

/** Duck indexes ordered by progress, leader first. */
export function standings(positions: number[]): number[] {
  return positions
    .map((p, duck) => ({ p, duck }))
    .sort((x, y) => y.p - x.p || x.duck - y.duck)
    .map((e) => e.duck)
}

/**
 * lineAt returns the call that should be on screen at tMs — the most recent one,
 * for CAPTION_HOLD_MS after it lands. Null means silence, which is a legitimate
 * state and not an error.
 */
export function lineAt(lines: Line[], tMs: number): Line | null {
  let current: Line | null = null
  for (const line of lines) {
    if (line.atMs > tMs) break
    current = line
  }
  if (!current) return null
  return tMs - current.atMs <= CAPTION_HOLD_MS ? current : null
}

/**
 * A screen-reader summary of the current standings. The canvas is decorative;
 * this is what makes the race followable without it.
 */
export function standingsLabel(
  positions: number[],
  duckNames: string[],
): string {
  if (positions.length === 0) return "Cuộc đua chưa bắt đầu"
  const order = standings(positions)
  const parts = order.map(
    (duck, rank) => `${rank + 1}. ${duckNames[duck] ?? `Vịt ${duck + 1}`}`,
  )
  return `Thứ tự hiện tại: ${parts.join(", ")}`
}
