import { describe, expect, it } from "vitest"
import {
  CAPTION_HOLD_MS,
  lineAt,
  positionsAt,
  standings,
  standingsLabel,
} from "../timeline"
import type { Line, Tick } from "../types"

const ticks: Tick[] = [
  { tMs: 0, positions: [0, 0] },
  { tMs: 50, positions: [0.1, 0.2] },
  { tMs: 100, positions: [0.4, 0.3] },
]

describe("positionsAt", () => {
  it("returns a sample exactly on a tick", () => {
    expect(positionsAt(ticks, 50)).toEqual([0.1, 0.2])
  })

  it("interpolates between samples so 20Hz data paints at 60fps", () => {
    expect(positionsAt(ticks, 75)).toEqual([
      0.1 + (0.4 - 0.1) * 0.5,
      0.2 + (0.3 - 0.2) * 0.5,
    ])
  })

  it("clamps before the start and holds the final frame after the end", () => {
    expect(positionsAt(ticks, -500)).toEqual([0, 0])
    expect(positionsAt(ticks, 999_999)).toEqual([0.4, 0.3])
  })

  it("returns empty for an empty timeline instead of throwing", () => {
    expect(positionsAt([], 100)).toEqual([])
  })

  it("handles a single-sample timeline", () => {
    expect(positionsAt([{ tMs: 0, positions: [0.5] }], 400)).toEqual([0.5])
  })

  it("never produces NaN, which is what a dropped tMs used to cause", () => {
    for (let t = -100; t <= 200; t += 7) {
      for (const p of positionsAt(ticks, t)) {
        expect(Number.isNaN(p)).toBe(false)
      }
    }
  })
})

describe("standings", () => {
  it("orders by progress, leader first", () => {
    expect(standings([0.2, 0.9, 0.5])).toEqual([1, 2, 0])
  })

  it("breaks exact ties by duck index so the order never flickers", () => {
    expect(standings([0.5, 0.5, 0.5])).toEqual([0, 1, 2])
  })
})

describe("lineAt", () => {
  const lines: Line[] = [
    { atMs: 0, text: "bắt đầu", intensity: 3, audioUrl: "" },
    { atMs: 5000, text: "vượt lên", intensity: 3, audioUrl: "" },
  ]

  it("shows the most recent call", () => {
    expect(lineAt(lines, 5200)?.text).toBe("vượt lên")
  })

  it("shows nothing before the first call", () => {
    expect(lineAt(lines, -1)).toBeNull()
  })

  it("clears the caption once its hold expires", () => {
    expect(lineAt(lines, CAPTION_HOLD_MS - 1)?.text).toBe("bắt đầu")
    expect(lineAt(lines, CAPTION_HOLD_MS + 1)).toBeNull()
  })

  it("handles the 0ms opening line, whose atMs the gateway drops", () => {
    expect(lineAt(lines, 0)?.text).toBe("bắt đầu")
  })
})

describe("standingsLabel", () => {
  it("describes the race for anyone not looking at the canvas", () => {
    expect(standingsLabel([0.2, 0.9], ["Đức", "Lan"])).toBe(
      "Thứ tự hiện tại: 1. Lan, 2. Đức",
    )
  })

  it("says so when there is nothing to describe yet", () => {
    expect(standingsLabel([], [])).toBe("Cuộc đua chưa bắt đầu")
  })
})
