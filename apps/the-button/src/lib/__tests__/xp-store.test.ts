import { beforeEach, describe, expect, it } from "vitest"
import { addComboBonus, loadComboBonus, MAX_COMBO_BONUS } from "../xp-store"

function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size
    },
  } as Storage
}

describe("xp-store", () => {
  let s: Storage
  beforeEach(() => {
    s = fakeStorage()
  })

  it("returns 0 when nothing is stored", () => {
    expect(loadComboBonus(s)).toBe(0)
  })

  it("accumulates positive deltas", () => {
    expect(addComboBonus(10, s)).toBe(10)
    expect(addComboBonus(5, s)).toBe(15)
    expect(loadComboBonus(s)).toBe(15)
  })

  it("ignores non-positive deltas", () => {
    addComboBonus(10, s)
    expect(addComboBonus(-3, s)).toBe(10)
    expect(addComboBonus(0, s)).toBe(10)
  })

  it("clamps to the maximum", () => {
    expect(addComboBonus(MAX_COMBO_BONUS + 999, s)).toBe(MAX_COMBO_BONUS)
  })

  it("treats corrupt storage as 0", () => {
    s.setItem("tb.xpBonus", "not-a-number")
    expect(loadComboBonus(s)).toBe(0)
  })
})
