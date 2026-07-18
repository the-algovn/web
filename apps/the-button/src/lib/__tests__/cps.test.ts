import { describe, expect, it } from "vitest"
import { countRecent, pruneRecent } from "../cps"

describe("cps window", () => {
  it("keeps only timestamps within the last window", () => {
    expect(pruneRecent([0, 400, 900], 1000)).toEqual([400, 900])
  })

  it("counts timestamps within the window", () => {
    expect(countRecent([0, 400, 900], 1000)).toBe(2)
    expect(countRecent([], 1000)).toBe(0)
  })

  it("honours a custom window", () => {
    expect(countRecent([0, 100, 250], 300, 200)).toBe(1)
  })
})
