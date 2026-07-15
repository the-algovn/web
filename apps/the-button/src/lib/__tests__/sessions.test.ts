import { describe, expect, it } from "vitest"
import { avgClicksPerSession, impact } from "../sessions"

describe("impact", () => {
  it("computes share of total as a percentage", () => {
    expect(impact(3_910, 1_204_882)).toBeCloseTo(0.3245, 3)
  })
  it("returns null when total or myTotal is unknown, or total is zero", () => {
    expect(impact(10, null)).toBeNull()
    expect(impact(10, 0)).toBeNull()
    expect(impact(null, 100)).toBeNull()
  })
})

describe("avgClicksPerSession", () => {
  it("divides total by users", () => {
    expect(avgClicksPerSession(1_204_882, 84_201)).toBeCloseTo(14.31, 2)
  })
  it("returns null when users is zero or unknown", () => {
    expect(avgClicksPerSession(100, 0)).toBeNull()
    expect(avgClicksPerSession(100, null)).toBeNull()
    expect(avgClicksPerSession(null, 10)).toBeNull()
  })
})
