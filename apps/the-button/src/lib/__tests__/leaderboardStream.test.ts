import { describe, expect, it, vi } from "vitest"
import { parseLeaderboardEvent, LeaderboardStream, type LeaderboardFrame } from "../leaderboardStream"

describe("parseLeaderboardEvent", () => {
  it("parses a leaderboard frame", () => {
    const f = parseLeaderboardEvent(
      JSON.stringify({
        type: "leaderboard",
        allTime: [{ rank: 1, name: "Minh", clicks: 1000 }],
        thisWeek: [{ rank: 1, name: "Minh", clicks: 40 }],
      }),
    )
    expect(f).not.toBeNull()
    expect(f!.allTime[0]).toEqual({ rank: 1, name: "Minh", clicks: 1000 })
    expect(f!.thisWeek[0]!.clicks).toBe(40)
  })

  it("rejects a non-leaderboard frame", () => {
    expect(parseLeaderboardEvent(JSON.stringify({ type: "counter", total: 5 }))).toBeNull()
  })

  it("rejects malformed json", () => {
    expect(parseLeaderboardEvent("{not json")).toBeNull()
  })
})

describe("LeaderboardStream", () => {
  it("delivers parsed frames from the injected EventSource and closes on stop", () => {
    const fake = {
      onopen: null as null | (() => void),
      onmessage: null as null | ((e: MessageEvent) => void),
      onerror: null as null | (() => void),
      close: vi.fn(),
    }
    const frames: LeaderboardFrame[] = []
    const s = new LeaderboardStream({
      onFrame: (f) => frames.push(f),
      createEventSource: () => fake as unknown as EventSource,
    })
    // start() synchronously calls createEventSource and assigns fake.onmessage
    s.start()
    fake.onmessage?.({
      data: JSON.stringify({ type: "leaderboard", allTime: [{ rank: 1, name: "a", clicks: 9 }], thisWeek: [] }),
    } as MessageEvent)
    expect(frames).toHaveLength(1)
    expect(frames[0]!.allTime[0]!.name).toBe("a")
    s.stop()
    expect(fake.close).toHaveBeenCalled()
  })
})
