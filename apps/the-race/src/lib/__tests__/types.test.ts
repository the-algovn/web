import { describe, expect, it } from "vitest"
import { normalizeRace, normalizeRoom, normalizeSummary } from "../types"

// These fixtures are shaped the way the gateway actually sends them: proto3
// JSON defaults, so every zero-valued scalar is simply absent. This is the
// regression guard for the whole file — reading raw responses gives undefined,
// and undefined becomes NaN the moment it reaches the playback maths.
describe("normalizeRace with gateway-omitted zeros", () => {
  it("defaults the opening line's missing atMs to 0", () => {
    const race = normalizeRace({
      raceId: "r1",
      durationMs: 13000,
      // no atMs: the opening call lands at 0ms, so protojson drops the field
      lines: [{ text: "Và chúng ta bắt đầu!", intensity: 3 }],
    })

    expect(race.lines[0]?.atMs).toBe(0)
    expect(Number.isNaN(race.lines[0]?.atMs)).toBe(false)
  })

  it("defaults the first tick's missing tMs to 0", () => {
    const race = normalizeRace({
      ticks: [{ positions: [0, 0] }, { tMs: 50, positions: [0.1, 0.09] }],
    })

    expect(race.ticks[0]?.tMs).toBe(0)
    expect(race.ticks[1]?.tMs).toBe(50)
  })

  it("survives a response with nothing but an id", () => {
    const race = normalizeRace({ raceId: "r1" })

    expect(race.duckNames).toEqual([])
    expect(race.ticks).toEqual([])
    expect(race.lines).toEqual([])
    expect(race.durationMs).toBe(0)
    expect(race.fairness.seedCommit).toBe("")
  })

  it("keeps a zero inside a repeated field, which protojson does send", () => {
    const race = normalizeRace({ finishOrder: [0, 2, 1] })
    expect(race.finishOrder).toEqual([0, 2, 1])
  })
})

describe("normalizeSummary", () => {
  // The nastiest case: duck 0 winning is completely ordinary, and it is exactly
  // when winnerIndex disappears from the wire.
  it("reads a duck-0 win as 0, not undefined", () => {
    const summary = normalizeSummary({
      raceId: "r1",
      status: "RACE_STATUS_READY",
      duckNames: ["Đức", "Lan"],
      // no winnerIndex — Đức won
      createdAtMs: "1785233471637",
    })

    expect(summary.winnerIndex).toBe(0)
    expect(summary.duckNames[summary.winnerIndex]).toBe("Đức")
  })

  it("parses int64 millis from their decimal string", () => {
    const summary = normalizeSummary({ createdAtMs: "1785233471637" })
    expect(summary.createdAtMs).toBe(1785233471637)
  })
})

describe("normalizeRoom", () => {
  it("tolerates an entirely absent room", () => {
    const room = normalizeRoom(undefined)
    expect(room.code).toBe("")
    expect(room.createdAtMs).toBe(0)
  })
})
