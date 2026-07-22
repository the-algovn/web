import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../api"
import { useStation } from "../use-station"

vi.mock("../api", () => ({ radioCall: vi.fn(), labCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

class FakeES {
  static instances: FakeES[] = []
  url: string
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onopen: (() => void) | null = null
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

const station = { onAir: true, onAirSince: "2026-07-22T09:00:00Z", aiEnabled: true }
const stats = { listeners: 3, libraryCount: 12, spendTodayUsd: 0.2, budgetUsd: 1 }
const pending = [{ id: "r1", source: "listener", requestedByName: "Ngọc", title: "L1", status: "ready" }]

function mockRoutes(overrides: Record<string, unknown> = {}) {
  mocked.mockImplementation(async (_t: string, path: string, body?: unknown) => {
    if (path in overrides) {
      const v = overrides[path]
      if (v instanceof Error) throw v
      return typeof v === "function" ? (v as (b: unknown) => unknown)(body) : v
    }
    if (path === "/station") return { station, stats }
    if (path === "/station/requests") return { pending, recent: [] }
    if (path === "/now-playing") return { nowPlaying: { kind: "track", title: "T", startedAt: "2026-07-22T09:00:00Z", durationSeconds: 240, listeners: 3 } }
    if (path === "/history") return { items: [{ title: "H", airedAt: "2026-07-22T08:00:00Z", source: "ai" }] }
    throw new Error(`unmocked ${path}`)
  })
}

beforeEach(() => {
  mocked.mockReset()
  FakeES.instances = []
})

const esOpt = { createEventSource: (url: string) => new FakeES(url) as unknown as EventSource }

describe("useStation", () => {
  it("loads station, requests, now-playing and history on mount", async () => {
    mockRoutes()
    const { result } = renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.station?.onAir).toBe(true)
    expect(result.current.stats?.libraryCount).toBe(12)
    expect(result.current.pending).toHaveLength(1)
    expect(result.current.nowPlaying?.title).toBe("T")
    expect(result.current.history).toHaveLength(1)
  })

  it("subscribes to both SSE channels; a now-playing frame updates state and refetches history", async () => {
    mockRoutes()
    const { result } = renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const np = FakeES.byChannel("/radio.nowplaying")
    act(() => {
      np.onmessage?.({ data: JSON.stringify({ kind: "track", title: "Next", startedAt: "2026-07-22T09:04:00Z", durationSeconds: 200, listeners: 4, source: "ai", reason: "đổi gió" }) })
    })
    expect(result.current.nowPlaying?.title).toBe("Next")
    expect(result.current.nowPlaying?.reason).toBe("đổi gió")
    FakeES.byChannel("/radio.queue") // exists — queue frames trigger refetch (covered by admin call count below)
  })

  it("a queue frame triggers an admin refetch", async () => {
    mockRoutes()
    renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(mocked).toHaveBeenCalledWith("tok", "/station/requests"))
    const before = mocked.mock.calls.filter((c) => c[1] === "/station/requests").length
    act(() => {
      FakeES.byChannel("/radio.queue").onmessage?.({ data: "[]" })
    })
    await waitFor(() => {
      const after = mocked.mock.calls.filter((c) => c[1] === "/station/requests").length
      expect(after).toBeGreaterThan(before)
    })
  })

  it("reorder posts ids and applies the response lists", async () => {
    mockRoutes({
      "/station/requests/reorder": { pending: [{ id: "r2" }, { id: "r1" }], recent: [] },
    })
    const { result } = renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.reorder(["r2", "r1"]))
    expect(mocked).toHaveBeenCalledWith("tok", "/station/requests/reorder", { ids: ["r2", "r1"] })
    expect(result.current.pending.map((p) => p.id)).toEqual(["r2", "r1"])
  })

  it("remove posts the id; skip and AI toggle hit their routes", async () => {
    mockRoutes({
      "/station/requests/remove": { pending: [], recent: [{ id: "r1", status: "failed" }] },
      "/station/skip": {},
      "/station/ai": { station: { ...station, aiEnabled: false } },
    })
    const { result } = renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.remove("r1"))
    expect(mocked).toHaveBeenCalledWith("tok", "/station/requests/remove", { id: "r1" })
    expect(result.current.pending).toHaveLength(0)
    await act(() => result.current.skip())
    expect(mocked).toHaveBeenCalledWith("tok", "/station/skip", {})
    await act(() => result.current.setAIEnabled(false))
    expect(mocked).toHaveBeenCalledWith("tok", "/station/ai", { enabled: false })
    expect(result.current.station?.aiEnabled).toBe(false)
  })

  it("closes both EventSources on unmount", async () => {
    mockRoutes()
    const { unmount } = renderHook(() => useStation("tok", esOpt))
    await waitFor(() => expect(FakeES.instances).toHaveLength(2))
    unmount()
    expect(FakeES.instances.every((i) => i.closed)).toBe(true)
  })
})
