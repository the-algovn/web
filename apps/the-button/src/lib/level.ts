// Cosmetic progression: XP is a pure function of real lifetime clicks plus a
// small, clamped cosmetic combo bonus. Level thresholds grow quadratically so
// the first levels come quickly and later ones stretch out. Because base XP is
// derived from the server-owned click total, a returning user's level is
// correct on any device even with localStorage cleared (they only lose the
// cosmetic bonus).

const BASE_XP_PER_CLICK = 10

export interface LevelState {
  level: number
  xp: number
  xpIntoLevel: number
  xpForNext: number
  pct: number
}

export function xpForClicks(clicks: number): number {
  return Math.max(0, Math.floor(clicks)) * BASE_XP_PER_CLICK
}

// Cumulative XP required to *be* at `level` (level 1 requires 0).
export function xpToReach(level: number): number {
  return 25 * level * (level - 1)
}

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1
  // Invert xpToReach: 25L^2 - 25L - xp <= 0.
  return Math.max(1, Math.floor((25 + Math.sqrt(625 + 100 * xp)) / 50))
}

export function levelState(totalClicks: number, bonusXp = 0): LevelState {
  const xp = xpForClicks(totalClicks) + Math.max(0, Math.floor(bonusXp))
  const level = levelForXp(xp)
  const base = xpToReach(level)
  const next = xpToReach(level + 1)
  const xpForNext = next - base
  const xpIntoLevel = xp - base
  const pct = xpForNext > 0 ? Math.min(100, (xpIntoLevel / xpForNext) * 100) : 0
  return { level, xp, xpIntoLevel, xpForNext, pct }
}
