import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../../lib/api"
import { Radio } from "../radio"

vi.mock("../../lib/api", () => ({ radioCall: vi.fn(), labCall: vi.fn() }))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "tok" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

const offAirStation = {}
const playlists = [
  { id: "p1", name: "mix", trackCount: 2, totalDurationS: "120", isActive: true },
  { id: "p2", name: "empty", trackCount: 0, totalDurationS: "0" },
]
const detail = {
  summary: playlists[0],
  tracks: [
    { ytId: "a", title: "Track A", channel: "Chan", durationS: "60" },
    { ytId: "b", title: "Track B", channel: "Chan", durationS: "60" },
  ],
}

function route(overrides: Record<string, unknown> = {}) {
  mocked.mockImplementation(async (_t: string, path: string, body?: unknown) => {
    if (path in overrides) {
      const v = overrides[path]
      if (v instanceof Error) throw v
      return typeof v === "function" ? (v as (b: unknown) => unknown)(body) : v
    }
    if (path === "/station") return { station: offAirStation }
    if (path === "/playlists") return { playlists }
    if (path === "/playlists/get") return { playlist: detail }
    throw new Error(`unmocked ${path}`)
  })
}

beforeEach(() => {
  mocked.mockReset()
})

describe("Radio module", () => {
  it("renders playlists and OFF AIR on mount, with go-on-air disabled sans active tracks", async () => {
    route({ "/station": { station: {} } })
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("mix")).toBeInTheDocument())
    expect(screen.getByText("OFF AIR")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go on air" })).toBeDisabled()
  })

  it("go on air calls the station route and flips the lamp", async () => {
    route({
      "/station": { station: { activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 2 } },
      "/station/on-air": { station: { onAir: true, activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 2, onAirSince: "2026-07-20T12:00:00Z" } },
    })
    render(<Radio />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Go on air" })).not.toBeDisabled())
    fireEvent.click(screen.getByRole("button", { name: "Go on air" }))
    await waitFor(() => expect(screen.getByText("ON AIR")).toBeInTheDocument())
    expect(mocked).toHaveBeenCalledWith("tok", "/station/on-air", {})
  })

  it("creating a playlist posts and selects it", async () => {
    route({
      "/playlists/create": { summary: { id: "p3", name: "night", trackCount: 0 } },
    })
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("mix")).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText("New playlist name"), { target: { value: "night" } })
    fireEvent.click(screen.getByLabelText("Create playlist"))
    await waitFor(() =>
      expect(mocked).toHaveBeenCalledWith("tok", "/playlists/create", { name: "night" }),
    )
  })

  it("selecting a playlist shows its tracks; move-down reorders", async () => {
    route({
      "/playlists/reorder": () => ({
        playlist: {
          ...detail,
          tracks: [detail.tracks[1], detail.tracks[0]],
        },
      }),
    })
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("mix")).toBeInTheDocument())
    fireEvent.click(screen.getByText("mix"))
    await waitFor(() => expect(screen.getByText("Track A")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Move down Track A"))
    await waitFor(() =>
      expect(mocked).toHaveBeenCalledWith("tok", "/playlists/reorder", {
        playlistId: "p1",
        ytIds: ["b", "a"],
      }),
    )
  })

  it("delete is disabled for the active playlist while on air", async () => {
    route({
      "/station": { station: { onAir: true, activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 2 } },
    })
    render(<Radio />)
    // StationBar's "active: mix" label and the playlist row both render the
    // text "mix" once on air with an active playlist, so wait on the
    // unambiguous delete button rather than plain text.
    await waitFor(() => expect(screen.getByLabelText("Delete mix")).toBeInTheDocument())
    expect(screen.getByLabelText("Delete mix")).toBeDisabled()
    expect(screen.getByLabelText("Delete empty")).not.toBeDisabled()
  })

  it("remove track calls the route from the editor", async () => {
    route({
      "/playlists/remove-track": {
        playlist: { summary: { ...playlists[0], trackCount: 1 }, tracks: [detail.tracks[1]] },
      },
    })
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("mix")).toBeInTheDocument())
    fireEvent.click(screen.getByText("mix"))
    await waitFor(() => expect(screen.getByText("Track A")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Remove Track A"))
    await waitFor(() =>
      expect(mocked).toHaveBeenCalledWith("tok", "/playlists/remove-track", {
        playlistId: "p1",
        ytId: "a",
      }),
    )
  })
})
