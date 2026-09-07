import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../api"
import { useStation } from "../use-station"

vi.mock("../api", () => ({ radioCall: vi.fn(), labCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

const station = { onAir: true, onAirSince: "2026-07-22T09:00:00Z", aiEnabled: true }
const stats = { listeners: 3, libraryCount: 12, spendTodayUsd: 0.2, budgetUsd: 1 }

function mockRoutes(overrides: Record<string, unknown> = {}) {
  mocked.mockImplementation(async (_t: string, path: string, body?: unknown) => {
    if (path in overrides) {
      const v = overrides[path]
      if (v instanceof Error) throw v
      return typeof v === "function" ? (v as (b: unknown) => unknown)(body) : v
    }
    if (path === "/station") return { station, stats }
    throw new Error(`unmocked ${path}`)
  })
}

beforeEach(() => {
  mocked.mockReset()
})

describe("useStation", () => {
  it("loads station and stats on mount", async () => {
    mockRoutes()
    const { result } = renderHook(() => useStation("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.station?.onAir).toBe(true)
    expect(result.current.stats?.libraryCount).toBe(12)
  })

  it("polls /station and nothing else", async () => {
    mockRoutes()
    const { result } = renderHook(() => useStation("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(new Set(mocked.mock.calls.map((c) => c[1]))).toEqual(new Set(["/station"]))
  })

  it("the AI toggle hits its route", async () => {
    mockRoutes({
      "/station/ai": { station: { ...station, aiEnabled: false } },
    })
    const { result } = renderHook(() => useStation("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.setAIEnabled(false))
    expect(mocked).toHaveBeenCalledWith("tok", "/station/ai", { enabled: false })
    expect(result.current.station?.aiEnabled).toBe(false)
  })
})
