import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { RequestApi, TrackRequest } from "../request-client"
import { useRequests } from "../use-requests"

const req = (id: string, status: TrackRequest["status"]): TrackRequest => ({
  id, source: "listener", ytId: "y" + id, title: "T" + id,
  durationS: 100, status, createdAt: "2026-07-22T01:00:00Z",
})

describe("useRequests", () => {
  it("loads on mount and refreshes on demand", async () => {
    let calls = 0
    const api = {
      myRequests: vi.fn(async () => {
        calls++
        return calls === 1 ? [req("1", "approved")] : [req("1", "aired")]
      }),
    } as unknown as RequestApi

    const { result } = renderHook(() => useRequests(api, "tok"))
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    expect(result.current.requests[0]?.status).toBe("approved")

    act(() => result.current.refresh())
    await waitFor(() =>
      expect(result.current.requests[0]?.status).toBe("aired"),
    )
  })

  it("stays empty without a token", async () => {
    const api = { myRequests: vi.fn() } as unknown as RequestApi
    const { result } = renderHook(() => useRequests(api, null))
    expect(result.current.requests).toEqual([])
    expect(api.myRequests).not.toHaveBeenCalled()
  })
})
