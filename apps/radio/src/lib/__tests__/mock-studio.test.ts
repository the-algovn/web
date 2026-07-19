import { beforeEach, describe, expect, it, vi } from "vitest"
import { MockStudio } from "../mock-studio"

let clock = 0
const studio = () => new MockStudio({ now: () => clock, random: () => 0.5 })

beforeEach(() => { clock = 1_700_000_000_000; vi.useFakeTimers() })

describe("MockStudio", () => {
  it("reports a now-playing item and a queue that hides recipients", async () => {
    const s = studio()
    const np = await s.getNowPlaying()
    expect(np.title).toBeTruthy()
    expect(np.listeners).toBeGreaterThan(0)
    const q = await s.getQueue()
    expect(q.length).toBeGreaterThan(0)
    expect(q.every(i => !("recipient" in i))).toBe(true)
  })

  it("advances now-playing as the virtual clock crosses the item boundary", async () => {
    const s = studio()
    const first = await s.getNowPlaying()
    const seen: string[] = []
    s.subscribeNowPlaying(np => seen.push(np.title))
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
})
