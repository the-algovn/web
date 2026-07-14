import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { LiveCounter, parseLiveEvent, type LiveCounterOptions, type LiveEvent } from "../liveCounter"

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }
  close() {
    this.closed = true
  }
}

function makeCounter(overrides: Partial<LiveCounterOptions> = {}) {
  const events: LiveEvent[] = []
  const fetchTotal = vi.fn(async () => 41)
  const live = new LiveCounter({
    onEvent: e => events.push(e),
    eventsUrl: "https://api.algovn.com/events/the-button.counter",
    createEventSource: url => new FakeEventSource(url) as unknown as EventSource,
    fetchTotal,
    random: () => 0.5,
    ...overrides,
  })
  return { live, events, fetchTotal }
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.instances = []
})

afterEach(() => {
  vi.useRealTimers()
})

it("parses typed payloads and rejects junk", () => {
  expect(parseLiveEvent('{"type":"counter","total":42}')).toEqual({ type: "counter", total: 42 })
  expect(
    parseLiveEvent('{"type":"milestone","threshold":1000,"title":"A Thousand Tiny Rebellions"}')
  ).toEqual({ type: "milestone", threshold: 1000, title: "A Thousand Tiny Rebellions" })
  expect(parseLiveEvent("not json")).toBeNull()
  expect(parseLiveEvent('{"type":"counter","total":"nope"}')).toBeNull()
})

it("forwards events from the stream", () => {
  const { live, events } = makeCounter()
  live.start()
  const es = FakeEventSource.instances[0]!
  expect(es.url).toBe("https://api.algovn.com/events/the-button.counter")
  es.onopen?.()
  es.onmessage?.({ data: '{"type":"counter","total":42}' } as MessageEvent)
  es.onmessage?.({ data: ": junk" } as MessageEvent)
  expect(events).toEqual([{ type: "counter", total: 42 }])
  live.stop()
})

it("reconnects with full jitter, cap doubling 5s -> 10s", async () => {
  const { live } = makeCounter()
  live.start()
  FakeEventSource.instances[0]!.onerror?.()
  expect(FakeEventSource.instances[0]!.closed).toBe(true)
  // failure 1: cap 5s, random 0.5 -> 2.5s
  await vi.advanceTimersByTimeAsync(2_499)
  expect(FakeEventSource.instances).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(FakeEventSource.instances).toHaveLength(2)
  FakeEventSource.instances[1]!.onerror?.()
  // failure 2: cap 10s, random 0.5 -> 5s
  await vi.advanceTimersByTimeAsync(5_000)
  expect(FakeEventSource.instances).toHaveLength(3)
  live.stop()
})

it("falls back to polling after 3 consecutive failures, stops once SSE recovers", async () => {
  const { live, events, fetchTotal } = makeCounter()
  live.start()
  FakeEventSource.instances[0]!.onerror?.()
  await vi.advanceTimersByTimeAsync(2_500) // -> instance 2
  FakeEventSource.instances[1]!.onerror?.()
  await vi.advanceTimersByTimeAsync(5_000) // -> instance 3
  FakeEventSource.instances[2]!.onerror?.() // 3rd failure: polling starts now
  await vi.advanceTimersByTimeAsync(0)
  expect(fetchTotal).toHaveBeenCalledTimes(1)
  expect(events).toContainEqual({ type: "counter", total: 41 })
  // next poll at 10s ± 3s with random 0.5 -> exactly 10s; reconnect (cap 20s,
  // random 0.5 -> 10s) lands at the same instant and creates instance 4
  await vi.advanceTimersByTimeAsync(10_000)
  expect(fetchTotal).toHaveBeenCalledTimes(2)
  expect(FakeEventSource.instances).toHaveLength(4)
  FakeEventSource.instances[3]!.onopen?.() // SSE recovered
  await vi.advanceTimersByTimeAsync(60_000)
  expect(fetchTotal).toHaveBeenCalledTimes(2) // polling stopped
  live.stop()
})

it("disconnects hidden tabs and reconnects when visible again", () => {
  const { live } = makeCounter()
  live.start()
  const es = FakeEventSource.instances[0]!
  es.onopen?.()
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
  document.dispatchEvent(new Event("visibilitychange"))
  expect(es.closed).toBe(true)
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
  document.dispatchEvent(new Event("visibilitychange"))
  expect(FakeEventSource.instances).toHaveLength(2)
  live.stop()
})
