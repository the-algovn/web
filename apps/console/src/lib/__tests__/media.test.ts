import { describe, expect, it } from "vitest"
import { formatClock } from "../media"

describe("formatClock", () => {
  it("formats seconds as m:ss", () => {
    expect(formatClock(0)).toBe("0:00")
    expect(formatClock(42)).toBe("0:42")
    expect(formatClock(240)).toBe("4:00")
    expect(formatClock(3661)).toBe("61:01")
  })
  it("guards NaN and negatives", () => {
    expect(formatClock(Number.NaN)).toBe("0:00")
    expect(formatClock(-5)).toBe("0:00")
  })
})
