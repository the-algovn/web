import { describe, expect, it, vi } from "vitest"
import type { NowPlaying } from "../radio-client"
import { createHttpClient } from "../radio-client.http"

class FakeEventSource {
  static last: FakeEventSource
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    FakeEventSource.last = this
  }
  close() {}
}

const deps = (request = vi.fn()) => ({
  request,
  createEventSource: (url: string) =>
    new FakeEventSource(url) as unknown as EventSource,
})

describe("createHttpClient", () => {
  it("reads now-playing from GET /now-playing, unwrapping the {nowPlaying} envelope", async () => {
    const request = vi.fn().mockResolvedValue({
      nowPlaying: {
        kind: "track",
        title: "X",
        startedAt: "2026-07-20T16:41:00Z",
        durationSeconds: 10,
        listeners: 3,
      },
    })
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    const np = await c.getNowPlaying()
    expect(request).toHaveBeenCalledWith("GET", "/now-playing")
    expect(np?.title).toBe("X")
  })

  it("returns null when the envelope omits nowPlaying (off-air)", async () => {
    const request = vi.fn().mockResolvedValue({})
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    expect(await c.getNowPlaying()).toBeNull()
  })

  it("defaults listeners to 0 when the wire omits it (protojson omits zero)", async () => {
    const request = vi.fn().mockResolvedValue({
      nowPlaying: {
        kind: "track",
        title: "X",
        startedAt: "2026-07-20T16:41:00Z",
        durationSeconds: 10,
      },
    })
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    const np = await c.getNowPlaying()
    expect(np?.listeners).toBe(0)
  })

  it("unwraps the {items} envelope from GET /queue", async () => {
    const request = vi.fn().mockResolvedValue({
      items: [{ title: "Q1", hasDedication: false }],
    })
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    const q = await c.getQueue()
    expect(request).toHaveBeenCalledWith("GET", "/queue")
    expect(q).toEqual([{ title: "Q1", hasDedication: false }])
  })

  it("unwraps the {items} envelope from GET /history", async () => {
    const request = vi.fn().mockResolvedValue({
      items: [{ title: "H1", airedAt: "2026-07-20T16:00:00Z" }],
    })
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    const h = await c.getHistory()
    expect(request).toHaveBeenCalledWith("GET", "/history")
    expect(h).toEqual([{ title: "H1", airedAt: "2026-07-20T16:00:00Z" }])
  })

  it("subscribes to the radio.nowplaying SSE channel and parses frames", () => {
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(),
    })
    const seen: string[] = []
    c.subscribeNowPlaying((np) => {
      if (np) seen.push(np.title)
    })
    expect(FakeEventSource.last.url).toBe("/events/radio.nowplaying")
    FakeEventSource.last.onopen?.()
    FakeEventSource.last.onmessage?.({
      data: JSON.stringify({
        kind: "track",
        title: "Y",
        startedAt: "2026-07-20T16:45:00Z",
        durationSeconds: 5,
        listeners: 2,
      }),
    } as MessageEvent)
    expect(seen).toEqual(["Y"])
  })

  it("maps an {offAir:true} SSE frame to onEvent(null)", () => {
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(),
    })
    const seen: (NowPlaying | null)[] = []
    c.subscribeNowPlaying((np) => seen.push(np))
    FakeEventSource.last.onopen?.()
    FakeEventSource.last.onmessage?.({
      data: JSON.stringify({ offAir: true }),
    } as MessageEvent)
    expect(seen).toEqual([null])
  })

  it("maps a null poll fetch to onEvent(null) once SSE fails over to polling", async () => {
    vi.useFakeTimers()
    const request = vi.fn().mockResolvedValue({}) // no nowPlaying -> off-air
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    const seen: (string | null)[] = []
    c.subscribeNowPlaying((np) => seen.push(np?.title ?? null))
    // Three consecutive SSE failures trip the polling fallback
    // (failuresBeforePolling defaults to 3); advancing by the max possible
    // reconnect backoff (60s) after each guarantees the next EventSource is
    // created regardless of the (unmocked) jitter draw.
    for (let i = 0; i < 3; i++) {
      FakeEventSource.last.onerror?.()
      await vi.advanceTimersByTimeAsync(60_000)
    }
    expect(seen.at(-1)).toBeNull()
    vi.useRealTimers()
  })

  it("posts a heartbeat with the session id", async () => {
    const request = vi.fn().mockResolvedValue({})
    const c = createHttpClient({
      apiBase: "/radio",
      eventsUrl: "/events",
      deps: deps(request),
    })
    await c.heartbeat("sess-1")
    expect(request).toHaveBeenCalledWith("POST", "/heartbeat", {
      sessionId: "sess-1",
    })
  })
})
