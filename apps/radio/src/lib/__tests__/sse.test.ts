import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSseChannel } from "../sse"

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }
  close() {
    this.closed = true
  }
}

beforeEach(() => {
  FakeEventSource.instances = []
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const channel = (over = {}) =>
  createSseChannel<{ n: number }>({
    url: "https://x/events/radio.nowplaying",
    parse: (d) => {
      try {
        return JSON.parse(d)
      } catch {
        return null
      }
    },
    onEvent: () => {},
    createEventSource: (url) =>
      new FakeEventSource(url) as unknown as EventSource,
    random: () => 0,
    ...over,
  })

describe("createSseChannel", () => {
  it("connects to the given url and forwards parsed events", () => {
    const seen: number[] = []
    const c = channel({ onEvent: (v: { n: number }) => seen.push(v.n) })
    c.start()
    const es = FakeEventSource.instances[0]!
    expect(es.url).toBe("https://x/events/radio.nowplaying")
    es.onopen?.()
    es.onmessage?.({ data: JSON.stringify({ n: 7 }) } as MessageEvent)
    expect(seen).toEqual([7])
    c.stop()
  })

  it("reconnects with a fresh EventSource after an error", () => {
    const c = channel()
    c.start()
    expect(FakeEventSource.instances).toHaveLength(1)
    FakeEventSource.instances[0]!.onerror?.()
    vi.advanceTimersByTime(5_000)
    expect(FakeEventSource.instances).toHaveLength(2)
    c.stop()
  })
})
