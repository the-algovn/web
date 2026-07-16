import { MILESTONE_CATALOG } from "./catalog"

// The grand target: one quadrillion clicks. 1e15 < Number.MAX_SAFE_INTEGER
// (~9.007e15), so Number math stays exact for the target and any realistic
// total.
export const TARGET = 1_000_000_000_000_000

export interface NextMilestone {
  threshold: number
  title: string
}

// nextMilestone returns the smallest catalog threshold strictly greater than
// total, or null once every milestone is passed.
export function nextMilestone(total: number): NextMilestone | null {
  for (const m of MILESTONE_CATALOG) {
    if (m.threshold > total) return m
  }
  return null
}

export interface Progress {
  next: NextMilestone | null
  percent: number
}

// progress fills toward the next unreached milestone (the bar climbs, then
// resets at each threshold); after the last milestone it targets the grand
// quadrillion.
export function progress(total: number): Progress {
  const next = nextMilestone(total)
  if (next) {
    return {
      next,
      percent: clampPercent((total / next.threshold) * 100),
    }
  }
  return {
    next: null,
    percent: clampPercent((total / TARGET) * 100),
  }
}

function clampPercent(p: number): number {
  if (!Number.isFinite(p) || p < 0) return 0
  return p > 100 ? 100 : p
}
