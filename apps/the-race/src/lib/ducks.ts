// Telling the ducks apart.
//
// Four identical 🦆 was the defect this redesign started from: in a game whose
// whole point is telling people apart, you could not tell who was who without
// reading a label. Colour fixes that — but colour alone excludes anyone who
// cannot see it, so the rank number, the name and the lane position each carry
// the same information independently.

import { standings } from "./timeline"
import type { Tick } from "./types"

/**
 * Twelve, because twelve is the largest field. Chosen to stay apart on the
 * stage's #111820 and to survive the common colourblindnesses in pairs that sit
 * next to each other in lane order.
 */
export const DUCK_COLORS = [
  "#FFD23F",
  "#00E07A",
  "#4CC9F0",
  "#F72585",
  "#FF8C42",
  "#B5179E",
  "#90E0EF",
  "#C1FF72",
  "#FF5C7A",
  "#7B61FF",
  "#FFB4A2",
  "#2EC4B6",
] as const

export function duckColor(duck: number): string {
  return DUCK_COLORS[duck % DUCK_COLORS.length] ?? DUCK_COLORS[0]
}

/**
 * ranksAt gives each duck its live position, 1-based, indexed by duck.
 *
 * Ties break by duck index, inherited from standings(). That is not a detail:
 * every race starts with the whole field level, and without a stable tie-break
 * the rank numbers would shuffle on every frame until someone pulled ahead.
 */
export function ranksAt(positions: number[]): number[] {
  const ranks = new Array<number>(positions.length).fill(1)
  standings(positions).forEach((duck, i) => {
    ranks[duck] = i + 1
  })
  return ranks
}

/**
 * finishGaps says how far behind the winner each duck finished, in seconds.
 *
 * A non-winner never reaches the winner's finishing position, so there is no
 * crossing time to subtract. The gap is instead the motorsport reading: how long
 * before the end the winner was at the position this duck ended up in. It comes
 * entirely from the ticks already in the package.
 */
export function finishGaps(ticks: Tick[], finishOrder: number[]): number[] {
  const last = ticks[ticks.length - 1]
  const winner = finishOrder[0]
  const gaps = new Array<number>(finishOrder.length).fill(0)
  if (!last || winner === undefined) return gaps

  const finalOf = (duck: number) => last.positions[duck] ?? 0

  for (const duck of finishOrder) {
    if (duck === winner) continue
    gaps[duck] = (last.tMs - winnerReached(ticks, winner, finalOf(duck))) / 1000
  }
  return gaps
}

/** When the winner first reached `target`, interpolated between samples. */
function winnerReached(ticks: Tick[], winner: number, target: number): number {
  for (let i = 1; i < ticks.length; i++) {
    const a = ticks[i - 1]
    const b = ticks[i]
    if (!a || !b) continue
    const from = a.positions[winner] ?? 0
    const to = b.positions[winner] ?? 0
    if (to < target) continue
    if (to === from) return a.tMs
    return a.tMs + ((target - from) / (to - from)) * (b.tMs - a.tMs)
  }
  return ticks[ticks.length - 1]?.tMs ?? 0
}
