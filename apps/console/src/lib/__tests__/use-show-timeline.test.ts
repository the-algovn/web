import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../api"
import { useShowTimeline } from "../use-show-timeline"

vi.mock("../api", () => ({ radioCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

class FakeES {
  static instances: FakeES[] = []
  url: string
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(url: string) {
    this.url = url
    FakeES.instances.push(this)
  }
  close() {
    this.closed = true
  }
  static byChannel(suffix: string): FakeES {
    const hit = FakeES.instances.find((i) => i.url.endsWith(suffix))
    if (!hit) throw new Error(`no EventSource for ${suffix}`)
    return hit
  }
}

const opts = {
  createEventSource: (url: string) => new FakeES(url) as unknown as EventSource,
}

// serverNow is computed per read, 30s ahead of this browser's clock, so the
// skew assertion does not depend on when the suite happens to run.
const SKEW_MS = 30_000
const bodyAt = () => ({
  airing: { segmentId: "air:9", kind: "track", certainty: "airing", title: "Airing", startedAt: "2026-09-07T08:00:00Z", durationS: 200 },
  past: [{ segmentId: "air:8", kind: "track", certainty: "aired", title: "Before" }],
  upcoming: [{ segmentId: "req:r1", kind: "track", certainty: "committed", title: "Next", requestId: "r1" }],
  staging: [],
  breakGate: "ok",
  totalPast: "41",
  serverNow: new Date(Date.now() + SKEW_MS).toISOString(),
})

beforeEach(() => {
  mocked.mockReset()
  vi.mocked(toast.error).mockReset()
  FakeES.instances = []
})

describe("useShowTimeline", () => {
  it("POSTs limit and offset, and normalises the response", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result } = renderHook(() => useShowTimeline("tok", opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Three arguments is what makes it a POST; radioCall(token, path) is a GET
    // and the gateway would unmarshal an empty body into a zero-value request.
    expect(mocked).toHaveBeenCalledWith("tok", "/station/timeline", { limit: 50, offset: 0 })
    expect(result.current.timeline?.airing?.title).toBe("Airing")
    expect(result.current.timeline?.totalPast).toBe(41)
  })

  it("keeps the last good snapshot when a poll fails, and toasts once", async () => {
    mocked.mockImplementationOnce(async () => bodyAt()).mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useShowTimeline("tok", { ...opts, pollMs: 20 }))
    await waitFor(() => expect(result.current.timeline?.airing?.title).toBe("Airing"))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 80))
    expect(result.current.timeline?.airing?.title).toBe("Airing")
    expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1)
  })

  it("corrects the playhead for clock skew using serverNow", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result } = renderHook(() => useShowTimeline("tok", { ...opts, tickMs: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // The server is SKEW_MS ahead, so the playhead must run ahead of the local
    // clock by about that much. A generous floor keeps this off a knife edge.
    await waitFor(() => {
      expect(result.current.nowMs - Date.now()).toBeGreaterThan(SKEW_MS / 2)
    })
  })

  it("refetches on an SSE nudge from either channel and closes both on unmount", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result, unmount } = renderHook(() => useShowTimeline("tok", opts))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const calls = mocked.mock.calls.length

    act(() => {
      FakeES.byChannel("/radio.nowplaying").onmessage?.({ data: "{}" })
    })
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(calls))

    const after = mocked.mock.calls.length
    act(() => {
      FakeES.byChannel("/radio.queue").onmessage?.({ data: "{}" })
    })
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(after))

    unmount()
    expect(FakeES.instances.every((i) => i.closed)).toBe(true)
  })

  it("skips, then refetches", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result } = renderHook(() => useShowTimeline("tok", opts))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mocked.mockClear()

    await act(async () => {
      await result.current.skip()
    })
    expect(mocked).toHaveBeenCalledWith("tok", "/station/skip", {})
    expect(mocked).toHaveBeenCalledWith("tok", "/station/timeline", { limit: 50, offset: 0 })
  })

  it("resyncs when the server rejects a stale reorder set", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result } = renderHook(() => useShowTimeline("tok", opts))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mocked.mockClear()

    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/station/requests/reorder") throw new Error("stale set")
      return bodyAt()
    })
    await act(async () => {
      await result.current.reorder(["r2", "r1"])
    })
    expect(mocked).toHaveBeenCalledWith("tok", "/station/timeline", { limit: 50, offset: 0 })
  })

  it("does nothing without a token", async () => {
    const { result } = renderHook(() => useShowTimeline(null, opts))
    await new Promise((r) => setTimeout(r, 20))
    expect(mocked).not.toHaveBeenCalled()
    expect(result.current.timeline).toBeNull()
  })

  it("pages the past by offset", async () => {
    mocked.mockImplementation(async () => bodyAt())
    const { result } = renderHook(() => useShowTimeline("tok", opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setPage(1))
    await waitFor(() => {
      expect(mocked).toHaveBeenCalledWith("tok", "/station/timeline", { limit: 50, offset: 50 })
    })
  })

  it("keeps ticking the playhead while every poll fails", async () => {
    mocked.mockRejectedValue(new Error("backend down"))
    const { result } = renderHook(() => useShowTimeline("tok", { ...opts, pollMs: 20, tickMs: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const first = result.current.nowMs
    await waitFor(() => expect(result.current.nowMs).toBeGreaterThan(first))
    expect(result.current.timeline).toBeNull()
  })
})
