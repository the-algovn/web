import { describe, expect, it } from "vitest"
import {
  fmtDuration,
  hhmm,
  isFact,
  label,
  layout,
  MIN_BLOCK_PCT,
  playheadPct,
  type Segment,
  toTimeline,
  WINDOW_AFTER_MS,
  WINDOW_BEFORE_MS,
} from "../show-timeline"

describe("toTimeline", () => {
  it("coerces the int64 totalPast, which arrives as a decimal string", () => {
    expect(toTimeline({ totalPast: "137" }).totalPast).toBe(137)
    expect(toTimeline({}).totalPast).toBe(0)
  })

  it("zeroes an unparseable totalPast rather than letting NaN reach the pager", () => {
    // NaN would render "page 1 / NaN of NaN" and leave Older enabled forever.
    expect(toTimeline({ totalPast: "not-a-number" }).totalPast).toBe(0)
  })

  it("never produces NaN from omitted zero-valued numerics", () => {
    const t = toTimeline({ upcoming: [{ segmentId: "proj:unknown:0", kind: "unknown", certainty: "unknown" }] })
    const s = t.upcoming[0]!
    expect(s.durationMs).toBe(0)
    expect(s.costUsd).toBe(0)
    expect(s.inTokens).toBe(0)
    expect(s.latencyMs).toBe(0)
    expect(s.startedAtMs).toBe(0)
    expect(Number.isNaN(s.durationMs + s.costUsd + s.startedAtMs)).toBe(false)
  })

  it("maps an absent airing to null, not an empty segment", () => {
    expect(toTimeline({ past: [] }).airing).toBeNull()
    expect(toTimeline({ airing: { segmentId: "air:9", certainty: "airing" } }).airing?.id).toBe("air:9")
  })

  it("treats a session with no endedAt as still open", () => {
    const t = toTimeline({ sessions: [{ startedAt: "2026-09-07T01:00:00Z" }, { startedAt: "2026-09-06T01:00:00Z", endedAt: "2026-09-06T03:00:00Z" }] })
    expect(t.sessions[0]!.endedAtMs).toBeNull()
    expect(t.sessions[1]!.endedAtMs).toBe(Date.parse("2026-09-06T03:00:00Z"))
  })

  it("converts durationS seconds to milliseconds", () => {
    const t = toTimeline({ airing: { segmentId: "air:1", durationS: 212 } })
    expect(t.airing?.durationMs).toBe(212_000)
  })

  it("defaults missing string fields to empty, so components never render undefined", () => {
    const s = toTimeline({ airing: { segmentId: "air:1" } }).airing
    expect(s?.title).toBe("")
    expect(s?.kind).toBe("")
    expect(s?.correlationId).toBe("")
  })
})

describe("isFact", () => {
  it("admits only aired and airing", () => {
    expect(isFact("aired")).toBe(true)
    expect(isFact("airing")).toBe(true)
    for (const c of ["committed", "prepared", "projected", "due", "unknown", "staging"]) {
      expect(isFact(c)).toBe(false)
    }
  })
})

describe("label", () => {
  it("names an untitled segment by its kind, and an untitled track Untitled", () => {
    const of = (kind: string) => label(toTimeline({ upcoming: [{ kind }] }).upcoming[0]!)
    expect(of("unknown")).toBe("Shuffle")
    expect(of("dj")).toBe("DJ break")
    expect(of("station_id")).toBe("Station ID")
    // The divergence the ribbon and the list used to disagree about: an
    // untitled track is not a shuffle roll.
    expect(of("track")).toBe("Untitled")
  })

  it("prefers the real title over every fallback", () => {
    expect(label(toTimeline({ upcoming: [{ kind: "unknown", title: "Bolero" }] }).upcoming[0]!)).toBe("Bolero")
  })
})

describe("formatters", () => {
  it("renders an epoch as HH:MM and 0 as a dash", () => {
    expect(hhmm(Date.parse("2026-09-07T08:05:00Z"), "UTC")).toBe("08:05")
    expect(hhmm(0, "UTC")).toBe("--:--")
  })

  it("renders a duration as m:ss and 0 as a dash", () => {
    expect(fmtDuration(212_000)).toBe("3:32")
    expect(fmtDuration(0)).toBe("--")
  })
})

const NOW = Date.parse("2026-09-07T09:00:00Z")

function block(startMs: number, durMs: number, over: Partial<Segment> = {}): Segment {
  return {
    id: `s${startMs}`, kind: "track", certainty: "aired", title: "T", artist: "",
    thumbnailUrl: "", startedAtMs: startMs, durationMs: durMs,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0,
    ...over,
  }
}

describe("layout", () => {
  it("puts the playhead where now sits in the window", () => {
    // 20 min back, 30 min forward = 50 min; now is 20/50 = 40% in.
    expect(playheadPct()).toBeCloseTo(40, 5)
  })

  it("places a segment starting at now immediately right of the playhead", () => {
    const [b] = layout([block(NOW, 10 * 60_000)], NOW)
    expect(b!.leftPct).toBeCloseTo(40, 5)
    expect(b!.widthPct).toBeCloseTo(20, 5) // 10 of 50 minutes
  })

  it("clips a segment straddling the left edge and flags it", () => {
    const start = NOW - WINDOW_BEFORE_MS - 5 * 60_000 // starts 5 min before the window
    const [b] = layout([block(start, 10 * 60_000)], NOW)
    expect(b!.leftPct).toBeCloseTo(0, 5)
    expect(b!.widthPct).toBeCloseTo(10, 5) // only the 5 min inside the window
    expect(b!.clippedLeft).toBe(true)
    expect(b!.clippedRight).toBe(false)
  })

  it("clips a segment straddling the right edge and flags it", () => {
    const start = NOW + WINDOW_AFTER_MS - 5 * 60_000
    const [b] = layout([block(start, 20 * 60_000)], NOW)
    expect(b!.clippedRight).toBe(true)
    expect(b!.leftPct + b!.widthPct).toBeCloseTo(100, 5)
  })

  it("omits a segment entirely outside the window", () => {
    const before = block(NOW - WINDOW_BEFORE_MS - 60 * 60_000, 60_000)
    const after = block(NOW + WINDOW_AFTER_MS + 60_000, 60_000)
    expect(layout([before, after], NOW)).toHaveLength(0)
  })

  it("gives a due sliver a minimum width so it stays clickable", () => {
    // A 12s station ID is 0.4% of a 50-minute window - about 3px at 800px.
    const [b] = layout([block(NOW, 12_000, { kind: "station_id", certainty: "due" })], NOW)
    expect(b!.widthPct).toBeGreaterThanOrEqual(MIN_BLOCK_PCT)
  })

  it("drops a segment with no start time rather than stacking it at the left edge", () => {
    expect(layout([block(0, 180_000)], 0)).toHaveLength(0)
  })

  it("keeps a zero-duration segment visible at the minimum width", () => {
    const [b] = layout([block(NOW, 0)], NOW)
    expect(b!.widthPct).toBeCloseTo(MIN_BLOCK_PCT, 5)
  })

  it("keeps a sub-floor block near the right edge unclipped and floored", () => {
    // A 12s segment starting 15 seconds before the window's right edge
    const start = NOW + WINDOW_AFTER_MS - 15_000
    const [b] = layout([block(start, 12_000)], NOW)
    expect(b!.widthPct).toBeGreaterThanOrEqual(MIN_BLOCK_PCT)
    expect(b!.leftPct + b!.widthPct).toBeLessThanOrEqual(100)
  })

  it("nudges a sub-floor block left when clipped at the right edge", () => {
    // A 30s segment starting 5 seconds before the window's right edge
    const start = NOW + WINDOW_AFTER_MS - 5_000
    const [b] = layout([block(start, 30_000)], NOW)
    expect(b!.clippedRight).toBe(true)
    expect(b!.widthPct).toBeGreaterThanOrEqual(MIN_BLOCK_PCT)
    expect(b!.leftPct + b!.widthPct).toBeLessThanOrEqual(100)
  })

  it("omits segments with zero overlap at the window edges", () => {
    // A segment ending exactly at the left edge has zero overlap
    const leftEdge = block(NOW - WINDOW_BEFORE_MS - 60_000, 60_000)
    // A segment starting exactly at the right edge has zero overlap
    const rightEdge = block(NOW + WINDOW_AFTER_MS, 60_000)
    expect(layout([leftEdge, rightEdge], NOW)).toHaveLength(0)
  })
})
