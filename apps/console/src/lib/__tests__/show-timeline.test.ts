import { describe, expect, it } from "vitest"
import { fmtDuration, hhmm, isFact, toTimeline } from "../show-timeline"

describe("toTimeline", () => {
  it("coerces the int64 totalPast, which arrives as a decimal string", () => {
    expect(toTimeline({ totalPast: "137" }).totalPast).toBe(137)
    expect(toTimeline({}).totalPast).toBe(0)
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
