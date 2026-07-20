import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../api"
import { useRadioAdmin } from "../use-radio-admin"

vi.mock("../api", () => ({ radioCall: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

const station = { onAir: true, activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 2 }
const summaries = [{ id: "p1", name: "mix", trackCount: 2, totalDurationS: "120", isActive: true }]
const playlist = {
  summary: summaries[0],
  tracks: [
    { ytId: "a", title: "A", durationS: "60" },
    { ytId: "b", title: "B", durationS: "60" },
  ],
}

// Route-aware default mock: GET /station and GET /playlists on mount.
function mockRoutes() {
  mocked.mockImplementation(async (_t: string, path: string) => {
    if (path === "/station") return { station }
    if (path === "/playlists") return { playlists: summaries }
    if (path === "/playlists/get") return { playlist }
    throw new Error(`unmocked ${path}`)
  })
}

beforeEach(() => {
  mocked.mockReset()
})

describe("useRadioAdmin", () => {
  it("loads station and playlists on mount", async () => {
    mockRoutes()
    const { result } = renderHook(() => useRadioAdmin("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.station?.onAir).toBe(true)
    expect(result.current.playlists).toHaveLength(1)
    expect(mocked).toHaveBeenCalledWith("tok", "/station")
    expect(mocked).toHaveBeenCalledWith("tok", "/playlists")
  })

  it("select fetches the playlist detail", async () => {
    mockRoutes()
    const { result } = renderHook(() => useRadioAdmin("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.select("p1"))
    await waitFor(() => expect(result.current.selected?.tracks).toHaveLength(2))
    expect(mocked).toHaveBeenCalledWith("tok", "/playlists/get", { id: "p1" })
  })

  it("reorder is optimistic and rolls back on error", async () => {
    // local 3-track fixture: with only 2 tracks, the rollback target and the
    // submitted order are the same 2 permutations, so a refetch can't be told
    // apart from a no-op. A distinct 3rd server-truth order proves the refetch landed.
    const playlist3 = {
      summary: { ...summaries[0], trackCount: 3 },
      tracks: [
        { ytId: "a", title: "A", durationS: "60" },
        { ytId: "b", title: "B", durationS: "60" },
        { ytId: "c", title: "C", durationS: "60" },
      ],
    }
    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/station") return { station }
      if (path === "/playlists") return { playlists: summaries }
      if (path === "/playlists/get") return { playlist: playlist3 }
      throw new Error(`unmocked ${path}`)
    })
    const { result } = renderHook(() => useRadioAdmin("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.select("p1"))
    await waitFor(() => expect(result.current.selected?.tracks).toHaveLength(3))

    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/playlists/reorder") throw new Error("stale")
      if (path === "/playlists/get")
        return {
          playlist: {
            ...playlist3,
            tracks: [
              { ytId: "c", title: "C", durationS: "60" },
              { ytId: "a", title: "A", durationS: "60" },
              { ytId: "b", title: "B", durationS: "60" },
            ],
          },
        }
      throw new Error(`unmocked ${path}`)
    })
    await act(() => result.current.reorder(["b", "a", "c"]))
    // final order matches server truth from the refetch, not the original
    // ["a","b","c"] or the optimistic/submitted ["b","a","c"]
    await waitFor(() =>
      expect(result.current.selected?.tracks?.map((t) => t.ytId)).toEqual(["c", "a", "b"]),
    )
    expect(mocked).toHaveBeenCalledWith("tok", "/playlists/reorder", {
      playlistId: "p1",
      ytIds: ["b", "a", "c"],
    })
  })

  it("goOnAir replaces station from the response", async () => {
    mockRoutes()
    const { result } = renderHook(() => useRadioAdmin("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/station/on-air") return { station: { ...station, onAirSince: "2026-07-20T12:00:00Z" } }
      if (path === "/playlists") return { playlists: summaries }
      throw new Error(`unmocked ${path}`)
    })
    await act(() => result.current.goOnAir())
    expect(result.current.station?.onAirSince).toBe("2026-07-20T12:00:00Z")
  })
})
