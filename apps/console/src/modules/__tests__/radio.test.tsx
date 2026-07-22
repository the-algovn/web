import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../../lib/api"
import { Radio } from "../radio"

vi.mock("../../lib/api", () => ({ radioCall: vi.fn(), labCall: vi.fn() }))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "tok" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

beforeEach(() => {
  mocked.mockReset()
  mocked.mockImplementation(async (_t: string, path: string) => {
    if (path === "/station")
      return { station: { onAir: true, aiEnabled: true }, stats: { listeners: 2, libraryCount: 9, spendTodayUsd: 0.1, budgetUsd: 1 } }
    if (path === "/station/requests")
      return { pending: [{ id: "r1", source: "ai", title: "Pick", status: "ready", reason: "khuya" }], recent: [] }
    if (path === "/now-playing")
      return { nowPlaying: { kind: "track", title: "Airing", startedAt: "2026-07-22T09:00:00Z", durationSeconds: 200, listeners: 2 } }
    if (path === "/history") return { items: [] }
    throw new Error(`unmocked ${path}`)
  })
})

describe("Radio module (station console)", () => {
  it("renders the real air: bar, now-playing, queue", async () => {
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("ON AIR")).toBeInTheDocument())
    expect(screen.getByText("Airing")).toBeInTheDocument()
    expect(screen.getByText("Pick")).toBeInTheDocument()
    expect(screen.getByText(/khuya/)).toBeInTheDocument()
    expect(screen.getByText("2 listening")).toBeInTheDocument()
    // no playlist UI anywhere
    expect(screen.queryByText("No playlists yet.")).not.toBeInTheDocument()
  })
})
