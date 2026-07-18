import { describe, expect, it } from "vitest"
import { levelForXp, levelState, xpForClicks, xpToReach } from "../level"

describe("level math", () => {
  it("gives 10 xp per real click", () => {
    expect(xpForClicks(0)).toBe(0)
    expect(xpForClicks(3)).toBe(30)
  })

  it("uses quadratic level thresholds (fast early levels)", () => {
    expect(xpToReach(1)).toBe(0)
    expect(xpToReach(2)).toBe(50)
    expect(xpToReach(3)).toBe(150)
    expect(xpToReach(4)).toBe(300)
  })

  it("maps xp back to the highest reached level", () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(49)).toBe(1)
    expect(levelForXp(50)).toBe(2)
    expect(levelForXp(150)).toBe(3)
    expect(levelForXp(-5)).toBe(1)
  })

  it("reports progress within the current level", () => {
    const s = levelState(10) // 100 xp -> level 2 (base 50, next 150)
    expect(s.level).toBe(2)
    expect(s.xp).toBe(100)
    expect(s.xpIntoLevel).toBe(50)
    expect(s.xpForNext).toBe(100)
    expect(s.pct).toBeCloseTo(50, 5)
  })

  it("adds the cosmetic bonus but never lets a negative bonus reduce xp", () => {
    expect(levelState(10, 50).xp).toBe(150)
    expect(levelState(10, -999).xp).toBe(100)
  })
})
