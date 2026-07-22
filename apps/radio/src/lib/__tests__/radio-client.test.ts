import { describe, expect, it } from "vitest"
import { parseHistoryItem, parseNowPlaying, parseQueue } from "../radio-client"

describe("parseNowPlaying", () => {
  it("accepts a well-formed track", () => {
    const np = parseNowPlaying({
      kind: "track",
      title: "Em Của Ngày Hôm Qua",
      artist: "Sơn Tùng M-TP",
      startedAt: "2026-07-20T16:41:00Z",
      durationSeconds: 258,
      listeners: 17,
    })
    expect(np?.title).toBe("Em Của Ngày Hôm Qua")
    expect(np?.listeners).toBe(17)
  })
  it("rejects missing required fields", () => {
    expect(parseNowPlaying({ kind: "track" })).toBeNull()
    expect(parseNowPlaying("nope")).toBeNull()
  })
  it("defaults listeners to 0 when omitted (protojson omits zero values)", () => {
    const np = parseNowPlaying({
      kind: "track",
      title: "Nơi Này Có Anh",
      startedAt: "2026-07-20T16:41:00Z",
      durationSeconds: 269,
    })
    expect(np?.listeners).toBe(0)
  })
  it("keeps provenance on now-playing and drops unknown sources", () => {
    const np = parseNowPlaying({
      kind: "track", title: "T", startedAt: "2026-07-22T05:00:00Z",
      durationSeconds: 240, listeners: 1,
      source: "ai", reason: "hợp đêm mưa",
    })
    expect(np?.source).toBe("ai")
    expect(np?.reason).toBe("hợp đêm mưa")
    expect(np?.requestedByName).toBeUndefined()

    const lis = parseNowPlaying({
      kind: "track", title: "T", startedAt: "2026-07-22T05:00:00Z",
      durationSeconds: 240, listeners: 1,
      source: "listener", requestedByName: "Ngọc",
    })
    expect(lis?.source).toBe("listener")
    expect(lis?.requestedByName).toBe("Ngọc")

    const odd = parseNowPlaying({
      kind: "track", title: "T", startedAt: "2026-07-22T05:00:00Z",
      durationSeconds: 240, listeners: 1, source: "wat",
    })
    expect(odd?.source).toBeUndefined()
  })
})

describe("parseQueue", () => {
  it("maps items and never surfaces a recipient", () => {
    const q = parseQueue([
      { title: "Nơi Này Có Anh", hasDedication: true, recipient: "Ngọc" },
    ])
    expect(q).toEqual([{ title: "Nơi Này Có Anh", hasDedication: true }])
    expect(JSON.stringify(q)).not.toContain("Ngọc")
  })
  it("rejects a non-array", () => {
    expect(parseQueue({})).toBeNull()
  })
  it("keeps source and requestedByName from the request queue", () => {
    const q = parseQueue([
      { title: "A", artist: "ch", hasDedication: false, source: "listener", requestedByName: "Ngọc" },
      { title: "B", hasDedication: false, source: "ai" },
      { title: "C", hasDedication: false, source: "wat" }, // unknown source dropped to undefined
    ])
    expect(q?.[0]).toEqual({
      title: "A", artist: "ch", hasDedication: false, source: "listener", requestedByName: "Ngọc",
    })
    expect(q?.[1]?.source).toBe("ai")
    expect(q?.[2]?.source).toBeUndefined()
  })
  it("keeps the reason on queue items", () => {
    const q = parseQueue([
      { title: "B", hasDedication: false, source: "ai", reason: "đổi gió" },
    ])
    expect(q?.[0]?.reason).toBe("đổi gió")
  })
})

describe("parseHistoryItem", () => {
  it("keeps provenance and drops unknown source to undefined", () => {
    const h = parseHistoryItem({
      title: "Nơi Này Có Anh",
      airedAt: "2026-07-22T05:00:00Z",
      source: "ai",
      requestedByName: "Ngọc",
      reason: "đổi gió",
    })
    expect(h).toEqual({
      title: "Nơi Này Có Anh",
      airedAt: "2026-07-22T05:00:00Z",
      source: "ai",
      requestedByName: "Ngọc",
      reason: "đổi gió",
    })

    const odd = parseHistoryItem({
      title: "T",
      airedAt: "2026-07-22T05:00:00Z",
      source: "wat",
    })
    expect(odd?.source).toBeUndefined()
  })
  it("rejects an item missing title", () => {
    expect(
      parseHistoryItem({ airedAt: "2026-07-22T05:00:00Z" }),
    ).toBeNull()
  })
})
