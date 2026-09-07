import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
      // The ribbon's window is anchored to real wall-clock time (nowMs starts
      // as Date.now() and only picks up the server skew on the next tick, which
      // never fires within a test's real-time span), so airing has to start
      // near actual now rather than a fixed instant or it falls outside the
      // ribbon's 50-minute window and no block renders.
      return {
        airing: { segmentId: "air:9", kind: "track", certainty: "airing", title: "Airing", startedAt: new Date(Date.now() - 60_000).toISOString(), durationS: 200 },
        past: [{ segmentId: "air:8", kind: "track", certainty: "aired", title: "Before" }],
        upcoming: [
          { segmentId: "req:r1", kind: "track", certainty: "committed", title: "Pick", requestId: "r1", source: "ai", reason: "khuya" },
          { segmentId: "proj:dj:1", kind: "dj", certainty: "due" },
        ],
        breakGate: "ok",
        totalPast: "41",
        serverNow: new Date().toISOString(),
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
    // The ribbon repeats the airing title too now, so scope to the list's
    // On-air section rather than asserting on the bare text.
    expect(within(screen.getByRole("region", { name: "On air" })).getByText("Airing")).toBeInTheDocument()
    expect(screen.getByText("Pick")).toBeInTheDocument()
    expect(screen.getByText(/khuya/)).toBeInTheDocument()
    expect(screen.getByText("Before")).toBeInTheDocument()
    expect(screen.getByText("có thể có")).toBeInTheDocument()
  })

  it("polls the station and the timeline, and nothing else", async () => {
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("Pick")).toBeInTheDocument())
    const paths = new Set(mocked.mock.calls.map((c) => c[1]))
    expect(paths).toEqual(new Set(["/station", "/station/timeline"]))
  })

  it("a persistently failing timeline poll renders the error state, not the skeleton", async () => {
    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/station") {
        return { station: { onAir: true, aiEnabled: true }, stats: { listeners: 2, libraryCount: 9, spendTodayUsd: 0.1, budgetUsd: 1 } }
      }
      if (path === "/station/timeline") throw new Error("boom")
      throw new Error(`unmocked ${path}`)
    })
    render(<Radio />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument())
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument()
  })

  it("clicking Retry issues another /station/timeline call", async () => {
    mocked.mockImplementation(async (_t: string, path: string) => {
      if (path === "/station") {
        return { station: { onAir: true, aiEnabled: true }, stats: { listeners: 2, libraryCount: 9, spendTodayUsd: 0.1, budgetUsd: 1 } }
      }
      if (path === "/station/timeline") throw new Error("boom")
      throw new Error(`unmocked ${path}`)
    })
    render(<Radio />)
    const retry = await screen.findByRole("button", { name: "Retry" })
    const before = mocked.mock.calls.filter((c) => c[1] === "/station/timeline").length
    fireEvent.click(retry)
    await waitFor(() => {
      const after = mocked.mock.calls.filter((c) => c[1] === "/station/timeline").length
      expect(after).toBeGreaterThan(before)
    })
  })

  it("shares selection between the ribbon and the list", async () => {
    render(<Radio />)
    await waitFor(() => expect(screen.getByText("Pick")).toBeInTheDocument())
    // The ribbon block's accessible name carries the time and the certainty
    // label, so this cannot accidentally match the plain list row button.
    const block = screen.getByRole("button", { name: /Airing .* on air/ })
    fireEvent.click(block)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Airing .* on air/ })).toHaveAttribute("aria-pressed", "true")
    })
  })
})
