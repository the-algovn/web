import { describe, expect, it } from "vitest"
import { nextMilestone, progress, TARGET } from "../progress"

describe("nextMilestone", () => {
  it("returns the first threshold above the total", () => {
    expect(nextMilestone(1_204_882)?.threshold).toBe(10_000_000)
  })
  it("returns the 1,000 milestone below the first threshold", () => {
    expect(nextMilestone(0)?.threshold).toBe(1_000)
  })
  it("treats an exact threshold as reached (next is the following one)", () => {
    expect(nextMilestone(1_000)?.threshold).toBe(100_000)
  })
  it("returns null once every milestone is passed", () => {
    expect(nextMilestone(2_000_000_000)).toBeNull()
  })
})

describe("progress", () => {
  it("fills toward the next milestone as a percentage", () => {
    const p = progress(1_204_882)
    expect(p.next?.threshold).toBe(10_000_000)
    expect(p.percent).toBeCloseTo(12.04882, 4)
    expect(p.label).toContain("10,000,000")
  })
  it("targets the quadrillion after the last milestone", () => {
    const p = progress(2_000_000_000)
    expect(p.next).toBeNull()
    expect(p.percent).toBeCloseTo((2_000_000_000 / TARGET) * 100, 10)
  })
  it("caps percent at 100", () => {
    expect(progress(TARGET * 2).percent).toBe(100)
  })
})
