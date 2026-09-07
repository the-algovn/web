import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { radioCall } from "../../lib/api"
import { Radio } from "../radio"

vi.mock("../../lib/api", () => ({
  radioCall: vi.fn(),
  labCall: vi.fn(),
  videoClawCall: vi.fn(),
  presignArtifact: vi.fn(),
  ApiError: class extends Error {},
}))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "tok" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(radioCall)

beforeEach(() => {
  mocked.mockReset()
  mocked.mockImplementation(async (_t: string, path: string) => {
    if (path === "/station") {
      return { station: { onAir: true, aiEnabled: true }, stats: { listeners: 2, libraryCount: 9, spendTodayUsd: 0.1, budgetUsd: 1 } }
    }
    if (path === "/station/timeline") {
      return {
        airing: { segmentId: "air:9", kind: "track", certainty: "airing", title: "Airing", startedAt: "2026-09-07T08:00:00Z", durationS: 200 },
        past: [{ segmentId: "air:8", kind: "track", certainty: "aired", title: "Before" }],
        upcoming: [
          { segmentId: "req:r1", kind: "track", certainty: "committed", title: "Pick", requestId: "r1", source: "ai", reason: "khuya" },
          { segmentId: "proj:dj:1", kind: "dj", certainty: "due" },
        ],
        breakGate: "ok",
        totalPast: "41",
        serverNow: "2026-09-07T08:01:00Z",
      }
    }
    throw new Error(`unmocked ${path}`)
  })
})

describe("Radio module (the show timeline)", () => {
  it("renders the bar and the show: airing, coming up, aired", async () => {
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("ON AIR")).toBeInTheDocument())
    expect(screen.getByText("2 listening")).toBeInTheDocument()
    expect(screen.getByText("Airing")).toBeInTheDocument()
    expect(screen.getByText("Pick")).toBeInTheDocument()
    expect(screen.getByText(/khuya/)).toBeInTheDocument()
    expect(screen.getByText("Before")).toBeInTheDocument()
    expect(screen.getByText("có thể có")).toBeInTheDocument()
  })

  it("polls the station and the timeline, and nothing else", async () => {
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("Airing")).toBeInTheDocument())
    const paths = new Set(mocked.mock.calls.map((c) => c[1]))
    expect(paths).toEqual(new Set(["/station", "/station/timeline"]))
  })
})
