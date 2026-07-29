import { describe, expect, it } from "vitest"
import { schedule, scheduledLineAt, INTRO_FALLBACK_GAP_MS, scheduleIntro, trackEndMs } from "../schedule"
import type { Line } from "../types"

const line = (atMs: number, text: string, intensity = 3): Line => ({
  atMs,
  text,
  intensity,
  audioUrl: "",
})

/** Every line the same length, for predictable collisions. */
const fixed = (ms: number) => () => ms

describe("schedule", () => {
  it("leaves a well-spaced script untouched", () => {
    const lines = [line(0, "a"), line(5000, "b"), line(10000, "c")]
    const { lines: out, dropped } = schedule(lines, fixed(2000))

    expect(dropped).toEqual([])
    expect(out.map((l) => l.startMs)).toEqual([0, 5000, 10000])
    expect(out.every((l) => !l.nudged)).toBe(true)
  })

  it("pushes a line that would start mid-sentence", () => {
    const lines = [line(0, "a"), line(1000, "b"), line(10000, "finish")]
    const { lines: out } = schedule(lines, fixed(3000))

    expect(out[0]?.startMs).toBe(0)
    // 'b' wanted 1000ms but 'a' is still speaking until 3000ms.
    expect(out[1]?.startMs).toBe(3000)
    expect(out[1]?.nudged).toBe(true)
  })

  // The finish call lands with the winner crossing — moving it desyncs the
  // moment the whole race builds toward.
  it("never moves the finish call", () => {
    const lines = [line(0, "a"), line(9000, "b"), line(10000, "finish", 5)]
    const { lines: out } = schedule(lines, fixed(4000))

    const finish = out[out.length - 1]
    expect(finish?.text).toBe("finish")
    expect(finish?.startMs).toBe(10000)
    expect(finish?.nudged).toBe(false)
  })

  it("drops a line rather than let it talk over the finish", () => {
    const lines = [line(0, "a"), line(9500, "late"), line(10000, "finish", 5)]
    const { lines: out, dropped } = schedule(lines, fixed(3000))

    expect(dropped.map((l) => l.text)).toEqual(["late"])
    expect(out.map((l) => l.text)).toEqual(["a", "finish"])
  })

  it("keeps the finish call even when everything else is dropped", () => {
    const lines = [line(0, "a"), line(100, "b"), line(200, "finish", 5)]
    const { lines: out } = schedule(lines, fixed(9000))

    expect(out).toHaveLength(1)
    expect(out[0]?.text).toBe("finish")
    expect(out[0]?.startMs).toBe(200)
  })

  // A line that failed to synthesize is a caption: it occupies no time and must
  // not push the lines after it.
  it("treats an unvoiced line as zero-length", () => {
    const lines = [line(0, "silent"), line(500, "b"), line(10000, "finish", 5)]
    const { lines: out } = schedule(lines, (_l, i) => (i === 0 ? 0 : 2000))

    expect(out[0]?.durationMs).toBe(0)
    expect(out[1]?.startMs).toBe(500)
    expect(out[1]?.nudged).toBe(false)
  })

  it("sorts out-of-order input before scheduling", () => {
    const lines = [line(5000, "b"), line(0, "a"), line(10000, "finish", 5)]
    const { lines: out } = schedule(lines, fixed(1000))

    expect(out.map((l) => l.text)).toEqual(["a", "b", "finish"])
  })

  it("is deterministic — two viewers hear the same thing", () => {
    const lines = [line(0, "a"), line(800, "b"), line(1200, "c"), line(9000, "f", 5)]
    const a = schedule(lines, fixed(1500))
    const b = schedule(lines, fixed(1500))
    expect(a).toEqual(b)
  })

  it("survives an empty script", () => {
    expect(schedule([], fixed(1000))).toEqual({ lines: [], dropped: [] })
  })

  it("handles a script that is only the finish call", () => {
    const { lines: out } = schedule([line(9000, "finish", 5)], fixed(2000))
    expect(out).toHaveLength(1)
    expect(out[0]?.startMs).toBe(9000)
  })

  it("never produces a negative or NaN start", () => {
    const lines = [line(0, "a"), line(3000, "b"), line(12000, "f", 5)]
    const { lines: out } = schedule(lines, fixed(1000))
    for (const l of out) {
      expect(Number.isFinite(l.startMs)).toBe(true)
      expect(l.startMs).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("scheduledLineAt", () => {
  const { lines: out } = schedule(
    [line(0, "a"), line(5000, "b"), line(10000, "f", 5)],
    fixed(2000),
  )

  it("shows the line that is speaking", () => {
    expect(scheduledLineAt(out, 5500, 3600)?.text).toBe("b")
  })

  it("shows nothing before the first line", () => {
    expect(scheduledLineAt(out, -1, 3600)).toBeNull()
  })

  // A voiced line stays up while it is still being spoken, even past the hold.
  it("holds a long clip for as long as it speaks", () => {
    const { lines: long } = schedule([line(0, "a"), line(9000, "f", 5)], fixed(8000))
    expect(scheduledLineAt(long, 7000, 1000)?.text).toBe("a")
  })

  it("clears a silent caption after the hold", () => {
    const { lines: silent } = schedule([line(0, "a"), line(9000, "f", 5)], fixed(0))
    expect(scheduledLineAt(silent, 999, 1000)?.text).toBe("a")
    expect(scheduledLineAt(silent, 1001, 1000)).toBeNull()
  })
})

const introLines: Line[] = [
  { atMs: 0, text: "Chào bà con!", intensity: 3, audioUrl: "a" },
  { atMs: 2500, text: "Thể lệ hôm nay…", intensity: 3, audioUrl: "b" },
  { atMs: 5000, text: "Các tay đua!", intensity: 3, audioUrl: "c" },
]

describe("scheduleIntro", () => {
  it("lays lines end to end from the measured clip lengths", () => {
    const { lines } = scheduleIntro(introLines, (_l, i) => [1800, 2200, 1500][i] ?? 0)
    expect(lines.map((l) => l.startMs)).toEqual([0, 1800, 4000])
  })

  it("never drops a line, however long the clips run", () => {
    const { lines, dropped } = scheduleIntro(introLines, () => 30_000)
    expect(lines).toHaveLength(3)
    expect(dropped).toEqual([])
  })

  it("falls back to a fixed gap for a line with no clip", () => {
    const { lines } = scheduleIntro(introLines, (_l, i) => (i === 1 ? 0 : 1000))
    expect(lines.map((l) => l.startMs)).toEqual([
      0,
      1000,
      1000 + INTRO_FALLBACK_GAP_MS,
    ])
  })

  it("keeps each line's source index so its clip can still be found", () => {
    const { lines } = scheduleIntro(introLines, () => 1000)
    expect(lines.map((l) => l.index)).toEqual([0, 1, 2])
  })
})

describe("trackEndMs", () => {
  it("is when the last line stops speaking", () => {
    const { lines } = scheduleIntro(introLines, () => 1200)
    expect(trackEndMs(lines)).toBe(3600)
  })

  it("is zero for a track with no lines", () => {
    expect(trackEndMs([])).toBe(0)
  })

  it("uses the fallback gap for a silent last line", () => {
    const { lines } = scheduleIntro(introLines, (_l, i) => (i === 2 ? 0 : 1000))
    expect(trackEndMs(lines)).toBe(2000 + INTRO_FALLBACK_GAP_MS)
  })
})
