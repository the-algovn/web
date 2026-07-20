import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../api"
import { useLibrary } from "../use-library"

vi.mock("../api", () => ({ labCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const mockedLabCall = vi.mocked(labCall)

const track = { ytId: "a", title: "One", artifactId: "art-1" }
const track2 = { ytId: "b", title: "Two", artifactId: "art-2" }

beforeEach(() => {
  mockedLabCall.mockReset()
  vi.mocked(toast.error).mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe("useLibrary", () => {
  it("auto-loads page 0 on mount once a token is present", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "1" })
    const { result } = renderHook(() => useLibrary("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/library/list", {
      query: "",
      limit: 20,
      offset: 0,
    })
    expect(result.current.total).toBe(1)
  })

  it("does not fetch until the token arrives", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [], total: "0" })
    const { rerender } = renderHook(({ t }) => useLibrary(t), {
      initialProps: { t: null as string | null },
    })
    expect(mockedLabCall).not.toHaveBeenCalled()
    rerender({ t: "tok" })
    await waitFor(() => expect(mockedLabCall).toHaveBeenCalledTimes(1))
  })

  it("changes offset when the page changes", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "40" })
    const { result } = renderHook(() => useLibrary("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setPage(1))
    await waitFor(() =>
      expect(mockedLabCall).toHaveBeenLastCalledWith("tok", "/library/list", {
        query: "",
        limit: 20,
        offset: 20,
      }),
    )
  })

  it("debounces typing into one fetch at page 0", async () => {
    vi.useFakeTimers()
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "1" })
    const { result } = renderHook(() => useLibrary("tok"))
    await vi.advanceTimersByTimeAsync(0) // let the mount fetch run
    mockedLabCall.mockClear()
    act(() => result.current.setPage(1))
    await vi.advanceTimersByTimeAsync(0)
    mockedLabCall.mockClear()
    act(() => result.current.setQuery("son"))
    act(() => result.current.setQuery("son tung"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(mockedLabCall).toHaveBeenCalledTimes(1)
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/library/list", {
      query: "son tung",
      limit: 20,
      offset: 0,
    })
  })

  it("clamps to the previous page when the last row of a page is deleted", async () => {
    // page 0 load, then move to page 1 with a single row, then delete it.
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "21" })
    const { result } = renderHook(() => useLibrary("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setPage(1))
    await waitFor(() => expect(result.current.page).toBe(1))
    mockedLabCall.mockClear()
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "20" })
    await act(async () => {
      await result.current.del("a")
    })
    // delete call + a refetch at offset 0 (page clamped 1 -> 0)
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/library/delete", { ytId: "a" })
    await waitFor(() => expect(result.current.page).toBe(0))
    expect(mockedLabCall).toHaveBeenLastCalledWith("tok", "/library/list", {
      query: "",
      limit: 20,
      offset: 0,
    })
  })

  it("toasts and keeps loading=false on fetch error", async () => {
    mockedLabCall.mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useLibrary("tok"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
    expect(result.current.loading).toBe(false)
  })

  it("refetches the same page when a non-last row is deleted", async () => {
    // page 0 load, move to page 1 which has two rows, delete one -> stay on page 1.
    mockedLabCall.mockResolvedValue({ tracks: [track, track2], total: "22" })
    const { result } = renderHook(() => useLibrary("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setPage(1))
    await waitFor(() => expect(result.current.page).toBe(1))
    mockedLabCall.mockClear()
    mockedLabCall.mockResolvedValue({ tracks: [track2], total: "21" })
    await act(async () => {
      await result.current.del("a")
    })
    expect(mockedLabCall).toHaveBeenCalledWith("tok", "/library/delete", { ytId: "a" })
    expect(result.current.page).toBe(1) // NOT clamped -> else branch, same page
    expect(mockedLabCall).toHaveBeenLastCalledWith("tok", "/library/list", {
      query: "",
      limit: 20,
      offset: 20, // same offset, distinguishing from the clamp case's offset 0
    })
  })

  it("ignores a stale response that resolves after a newer request", async () => {
    vi.useFakeTimers() // pin the 300ms mount-debounce so it never fires setPage(0)
    const defer = <T,>() => {
      let resolve!: (v: T) => void
      const promise = new Promise<T>((r) => {
        resolve = r
      })
      return { promise, resolve }
    }
    const first = defer<{ tracks: unknown[]; total: string }>() // mount fetch, reqId=1
    const second = defer<{ tracks: unknown[]; total: string }>() // page-1 fetch, reqId=2
    mockedLabCall.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => useLibrary("tok"))
    act(() => result.current.setPage(1)) // starts the newer fetch, reqId=2

    // Newer request resolves FIRST.
    await act(async () => {
      second.resolve({ tracks: [track2], total: "40" })
    })
    // Stale earlier request resolves LAST — must be ignored.
    await act(async () => {
      first.resolve({ tracks: [track], total: "1" })
    })

    expect(result.current.tracks).toEqual([track2]) // NOT [track]
    expect(result.current.total).toBe(40) // NOT 1
    expect(result.current.page).toBe(1)
  })
})
