import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../api"
import { useLLMAudit } from "../use-llm-audit"

vi.mock("../api", () => ({ labCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const mockedLabCall = vi.mocked(labCall)

const call = { id: "1", ts: "2026-07-27T12:00:00Z", label: "director:backsell", model: "gemini-2.5-flash", provider: "gemini", costUsd: 0.001 }

beforeEach(() => {
  mockedLabCall.mockReset()
  vi.mocked(toast.error).mockReset()
  // default: list then stats
  mockedLabCall.mockImplementation(async (_t, path) => {
    if (path === "/llm-calls/list") return { calls: [call], total: "1" }
    if (path === "/llm-calls/stats") return { stats: [{ label: "director:backsell", model: "gemini-2.5-flash", count: 1, costUsd: 0.001 }], totalUsd: 0.001 }
    return {}
  })
})

describe("useLLMAudit", () => {
  it("loads page 0 (list + stats) on mount", async () => {
    const { result } = renderHook(() => useLLMAudit("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/llm-calls/list", { label: "", errorsOnly: false, limit: 20, offset: 0 })
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/llm-calls/stats", { windowDays: 30 })
    expect(result.current.total).toBe(1)
    expect(result.current.calls).toHaveLength(1)
    expect(result.current.totalUsd).toBe(0.001)
  })

  it("refetches at offset 0 when the label filter changes", async () => {
    const { result } = renderHook(() => useLLMAudit("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setPage(1))
    await waitFor(() => expect(result.current.page).toBe(1))
    act(() => result.current.setLabel("programmer:pick"))
    await waitFor(() =>
      expect(mockedLabCall).toHaveBeenLastCalledWith("tok", "/llm-calls/list", { label: "programmer:pick", errorsOnly: false, limit: 20, offset: 0 }),
    )
    expect(result.current.page).toBe(0) // reset to page 0
  })

  it("toasts on list error", async () => {
    mockedLabCall.mockRejectedValue(new Error("boom"))
    renderHook(() => useLLMAudit("tok"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
  })
})
