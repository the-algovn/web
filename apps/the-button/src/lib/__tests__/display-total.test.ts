import { describe, expect, it } from "vitest"
import { mergeDisplayTotal } from "../display-total"

describe("mergeDisplayTotal", () => {
  it("returns null before the first server total arrives", () => {
    expect(mergeDisplayTotal(null, 3, 0)).toBeNull()
  })

  it("credits pending clicks on top of the server total", () => {
    expect(mergeDisplayTotal(1_000, 5, 0)).toBe(1_005)
  })

  it("holds the floor when a landed batch drops pending before the server catches up", () => {
    // 5 clicks pending on top of 1,000 -> 1,005 on screen
    expect(mergeDisplayTotal(1_000, 5, 0)).toBe(1_005)
    // the submit lands: pending -> 0, but the publisher's 1s tick has not
    // reflected those clicks yet. The display must NOT drop back to 1,000.
    expect(mergeDisplayTotal(1_000, 0, 1_005)).toBe(1_005)
  })

  it("releases the floor once the server total catches up", () => {
    expect(mergeDisplayTotal(1_005, 0, 1_005)).toBe(1_005)
    expect(mergeDisplayTotal(1_006, 0, 1_005)).toBe(1_006)
  })

  it("never decreases across an adversarial sequence", () => {
    // server total jitters (late frames, polling fallback, a discarded 502
    // batch) while pending swings; the display must only ever rise.
    const steps: Array<[number, number]> = [
      [100, 0],
      [100, 4],
      [104, 0],
      [103, 2],
      [90, 0],
      [104, 1],
      [200, 0],
      [199, 0],
    ]
    let floor = 0
    let shown = 0
    for (const [server, pending] of steps) {
      const next = mergeDisplayTotal(server, pending, floor)
      expect(next).not.toBeNull()
      expect(next!).toBeGreaterThanOrEqual(shown)
      shown = next!
      floor = next!
    }
  })
})
