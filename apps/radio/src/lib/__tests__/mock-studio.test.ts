import { beforeEach, describe, expect, it, vi } from "vitest"
import { MockStudio } from "../mock-studio"

let clock = 0
const studio = () => new MockStudio({ now: () => clock, random: () => 0.5 })

beforeEach(() => {
  clock = 1_700_000_000_000
  vi.useFakeTimers()
})

describe("MockStudio", () => {
  it("reports a now-playing item and a queue that hides recipients", async () => {
    const s = studio()
    const np = await s.getNowPlaying()
    expect(np.title).toBeTruthy()
    expect(np.listeners).toBeGreaterThan(0)
    const q = await s.getQueue()
    expect(q.length).toBeGreaterThan(0)
    expect(q.every((i) => !("recipient" in i))).toBe(true)
  })

  it("advances now-playing as the virtual clock crosses the item boundary", async () => {
    const s = studio()
    const first = await s.getNowPlaying()
    const seen: string[] = []
    s.subscribeNowPlaying((np) => seen.push(np.title))
    clock += (first.durationSeconds + 1) * 1000
    vi.advanceTimersByTime(600)
    expect(seen.at(-1)).not.toBe(first.title)
  })

  it("moves a finished item into history", async () => {
    const s = studio()
    const first = await s.getNowPlaying()
    clock += (first.durationSeconds + 1) * 1000
    vi.advanceTimersByTime(600)
    const hist = await s.getHistory()
    expect(hist[0]?.title).toBe(first.title)
  })

  it("keeps startedAt stable across calls within the same item (no sub-second jitter)", async () => {
    clock = 1_700_000_000_000 + 100_777
    const s = studio()
    const a = await s.getNowPlaying()
    clock += 273
    const b = await s.getNowPlaying()
    expect(a.startedAt).toBe(b.startedAt)
    expect(a.startedAt).toBe(new Date(1_700_000_000_000).toISOString())
  })

  it("emits the queue synchronously to a subscriber, before any timer advance", () => {
    const s = studio()
    const received: unknown[][] = []
    s.subscribeQueue((q) => received.push(q))
    expect(received.length).toBe(1)
    expect(received[0]?.length).toBeGreaterThan(0)
  })

  it("gives a second now-playing subscriber its own immediate emission", async () => {
    const s = studio()
    const first = await s.getNowPlaying()
    const firstSeen: string[] = []
    s.subscribeNowPlaying((np) => firstSeen.push(np.title))
    const secondSeen: string[] = []
    s.subscribeNowPlaying((np) => secondSeen.push(np.title))
    expect(secondSeen.at(-1)).toBe(first.title)
  })

  it("playheadMs returns the injected clock", () => {
    const s = studio()
    expect(s.playheadMs()).toBe(clock)
    clock += 12_345
    expect(s.playheadMs()).toBe(clock)
  })
})
