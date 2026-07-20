// The cosmetic combo XP bonus is the only progression value we persist locally.
// It is clamped so it can never dominate the click-derived base XP, and any
// storage error degrades to 0 (the base level still renders from the server
// total).
const KEY = "tb.xpBonus"
export const MAX_COMBO_BONUS = 100_000

export function loadComboBonus(storage: Storage = localStorage): number {
  try {
    const raw = storage.getItem(KEY)
    const n = raw === null ? 0 : Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0
    return Math.min(n, MAX_COMBO_BONUS)
  } catch {
    return 0
  }
}

export function addComboBonus(
  delta: number,
  storage: Storage = localStorage,
): number {
  const add = Math.max(0, Math.floor(delta))
  const next = Math.min(MAX_COMBO_BONUS, loadComboBonus(storage) + add)
  try {
    storage.setItem(KEY, String(next))
  } catch {
    // best-effort: a full/blocked store just means the bonus doesn't persist
  }
  return next
}
