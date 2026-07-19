import { describe, expect, it, vi } from "vitest"
import { createHttpClient } from "../radio-client.http"

class FakeEventSource {
  static last: FakeEventSource
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) { FakeEventSource.last = this }
  close() {}
}

const deps = (request = vi.fn()) => ({
  request,
  createEventSource: (url: string) => new FakeEventSource(url) as unknown as EventSource,
})

describe("createHttpClient", () => {
  it("reads now-playing from GET /now-playing", async () => {
    const request = vi.fn().mockResolvedValue({
      kind: "track", title: "X", startedAt: "2026-07-20T16:41:00Z", durationSeconds: 10, listeners: 3,
    })
    const c = createHttpClient({ apiBase: "/radio", eventsUrl: "/events", deps: deps(request) })
    const np = await c.getNowPlaying()
    expect(request).toHaveBeenCalledWith("GET", "/now-playing")
    expect(np.title).toBe("X")
  })

  it("subscribes to the radio.nowplaying SSE channel and parses frames", () => {
    const c = createHttpClient({ apiBase: "/radio", eventsUrl: "/events", deps: deps() })
    const seen: string[] = []
    c.subscribeNowPlaying(np => seen.push(np.title))
    expect(FakeEventSource.last.url).toBe("/events/radio.nowplaying")
    FakeEventSource.last.onopen?.()
    FakeEventSource.last.onmessage?.({
      data: JSON.stringify({ kind: "track", title: "Y", startedAt: "2026-07-20T16:45:00Z", durationSeconds: 5, listeners: 2 }),
    } as MessageEvent)
    expect(seen).toEqual(["Y"])
  })

  it("posts a heartbeat with the session id", async () => {
    const request = vi.fn().mockResolvedValue({})
    const c = createHttpClient({ apiBase: "/radio", eventsUrl: "/events", deps: deps(request) })
    await c.heartbeat("sess-1")
    expect(request).toHaveBeenCalledWith("POST", "/heartbeat", { sessionId: "sess-1" })
  })
})
