import { describe, expect, it } from "vitest"
import {
  comboXpBonus,
  createCombo,
  labelForHeat,
  multiplierForHeat,
} from "../combo"

describe("combo heat model", () => {
  it("maps heat 0..100 to multiplier x1..x5", () => {
    expect(multiplierForHeat(0)).toBe(1)
    expect(multiplierForHeat(100)).toBe(5)
    expect(multiplierForHeat(50)).toBe(3)
    expect(multiplierForHeat(999)).toBe(5) // clamped
  })

  it("labels heat bands", () => {
    expect(labelForHeat(0)).toBe("idle")
    expect(labelForHeat(10)).toBe("warming")
    expect(labelForHeat(100)).toBe("on fire")
  })

  it("gives a non-negative integer XP bonus that grows with the multiplier", () => {
    expect(comboXpBonus(1)).toBe(0)
    expect(comboXpBonus(5)).toBe(20)
    expect(comboXpBonus(0.5)).toBe(0)
  })
})

describe("createCombo", () => {
  it("builds heat on press and caps the multiplier at x5", () => {
    const c = createCombo({ heatPerPress: 14 })
    let s = c.press(0)
    expect(s.heat).toBeCloseTo(14, 5)
    for (let t = 1; t <= 20; t++) s = c.press(t) // saturate
    expect(s.heat).toBe(100)
    expect(s.multiplier).toBe(5)
  })

  it("decays toward idle over time", () => {
    const c = createCombo({ heatPerPress: 100, decayPerMs: 0.1 })
    c.press(0) // heat 100
    const s = c.tick(500) // 500ms * 0.1 = 50 decay
    expect(s.heat).toBeCloseTo(50, 5)
    const idle = c.tick(100_000)
    expect(idle.heat).toBe(0)
    expect(idle.label).toBe("idle")
  })
})
