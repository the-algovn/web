import { describe, expect, it } from "vitest"
import { DUCK_COLORS, duckColor, finishGaps, ranksAt } from "../ducks"
import type { Tick } from "../types"

describe("duckColor", () => {
  it("gives each duck in a full field its own colour", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => duckColor(i))
    expect(new Set(twelve).size).toBe(12)
  })

  it("wraps rather than running out", () => {
    expect(duckColor(DUCK_COLORS.length)).toBe(duckColor(0))
  })

  it("never hands a duck the chrome's accent", () => {
    // #00E07A is the LIVE dot, the progress bar, the seal, the leader's lane
    // tint and the winner's panel. A duck wearing it reads as furniture — and
    // when it leads, the duck and its lit lane are the same colour.
    expect([...DUCK_COLORS]).not.toContain("#00E07A")
  })
})

describe("ranksAt", () => {
  it("ranks by progress, leader first", () => {
    expect(ranksAt([0.2, 0.9, 0.5])).toEqual([3, 1, 2])
  })

  it("breaks an exact tie by duck index, so the order never flickers", () => {
    // Two ducks dead level is not a rendering edge case — it is every race at
    // t=0. Without a deterministic tie-break the labels swap on every frame.
    expect(ranksAt([0.5, 0.5, 0.5])).toEqual([1, 2, 3])
  })

  it("is all first place for an empty field", () => {
    expect(ranksAt([])).toEqual([])
  })
})

describe("finishGaps", () => {
  // The winner crosses at the last tick. Another duck's gap is how long ago the
  // winner was where that duck ended up — the standard reading of a time gap,
  // and derivable from the ticks with no new server data.
  const ticks: Tick[] = [
    { tMs: 0, positions: [0, 0, 0] },
    { tMs: 1000, positions: [0.5, 0.4, 0.2] },
    { tMs: 2000, positions: [1, 0.8, 0.5] },
  ]

  it("is zero for the winner", () => {
    expect(finishGaps(ticks, [0, 1, 2])[0]).toBe(0)
  })

  it("is the time since the winner passed where each duck ended", () => {
    const gaps = finishGaps(ticks, [0, 1, 2])
    // The winner was at 0.8 at 1600ms (interpolated), so duck 1 is 0.4s back.
    expect(gaps[1]).toBeCloseTo(0.4, 2)
    // The winner was at 0.5 at 1000ms, so duck 2 is 1.0s back.
    expect(gaps[2]).toBeCloseTo(1.0, 2)
  })

  it("is zero everywhere when there are no ticks to read", () => {
    expect(finishGaps([], [0, 1])).toEqual([0, 0])
  })
})
