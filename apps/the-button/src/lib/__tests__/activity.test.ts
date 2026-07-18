import { describe, expect, it } from "vitest"
import { emptyFeed, MAX_FEED, pushTotal } from "../activity"

describe("activity feed", () => {
  it("ignores the first total (it only seeds the baseline)", () => {
    const s = pushTotal(emptyFeed(), 1000)
    expect(s.items).toEqual([])
    expect(s.lastTotal).toBe(1000)
  })

  it("emits the positive delta between totals, newest first", () => {
    let s = pushTotal(emptyFeed(), 1000)
    s = pushTotal(s, 1012)
    s = pushTotal(s, 1015)
    expect(s.items.map((i) => i.amount)).toEqual([3, 12])
    expect(s.items[0].id).not.toBe(s.items[1].id)
  })

  it("ignores non-positive deltas (stale or reset frames)", () => {
    let s = pushTotal(emptyFeed(), 1000)
    s = pushTotal(s, 990)
    s = pushTotal(s, 1000)
    expect(s.items).toEqual([])
    expect(s.lastTotal).toBe(1000)
  })

  it("caps the list length", () => {
    let s = pushTotal(emptyFeed(), 0)
    for (let i = 1; i <= MAX_FEED + 3; i++) s = pushTotal(s, i)
    expect(s.items).toHaveLength(MAX_FEED)
  })
})
