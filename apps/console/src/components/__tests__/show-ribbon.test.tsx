import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MIN_BLOCK_PCT, type Segment, type Timeline } from "../../lib/show-timeline"
import { ShowRibbon } from "../show-ribbon"

const NOW = Date.parse("2026-09-07T09:00:00Z")

function seg(over: Partial<Segment> = {}): Segment {
  return {
    id: "x", kind: "track", certainty: "aired", title: "T", artist: "",
    thumbnailUrl: "", startedAtMs: NOW, durationMs: 180_000,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0,
    ...over,
  }
}

function timeline(over: Partial<Timeline> = {}): Timeline {
  return {
    past: [seg({ id: "air:8", startedAtMs: NOW - 300_000, title: "Older" })],
    airing: seg({ id: "air:9", certainty: "airing", startedAtMs: NOW - 60_000, title: "Now" }),
    upcoming: [seg({ id: "req:r1", certainty: "committed", startedAtMs: NOW + 120_000, title: "Next" })],
    staging: [],
    sessions: [],
    breakGate: "ok",
    totalPast: 1,
    serverNowMs: NOW,
    ...over,
  }
}

describe("ShowRibbon", () => {
  it("draws a block per in-window segment, keyed by segment id", () => {
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByRole("button", { name: /Older/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Now/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument()
  })

  it("places the playhead at 40% of the window", () => {
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByTestId("playhead").style.left).toBe("40%")
  })

  it("omits a segment outside the window but does not crash", () => {
    const tl = timeline({ past: [seg({ id: "air:1", startedAtMs: NOW - 3 * 60 * 60_000, title: "Ancient" })] })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.queryByRole("button", { name: /Ancient/ })).not.toBeInTheDocument()
  })

  it("marks the selected block", () => {
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId="air:9" onSelect={() => {}} />)
    expect(screen.getByRole("button", { name: /Now/ })).toHaveAttribute("aria-pressed", "true")
  })

  it("selects on click", () => {
    const onSelect = vi.fn()
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    expect(onSelect).toHaveBeenCalledWith("req:r1")
  })

  it("floors a 12s station ID at the minimum width so it stays clickable", () => {
    // 12s of a 50-minute window is 0.4%, about three pixels at 800px wide.
    const tl = timeline({ upcoming: [seg({ id: "proj:station_id:0", kind: "station_id", certainty: "due", title: "", startedAtMs: NOW + 60_000, durationMs: 12_000 })] })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const sliver = screen.getByRole("button", { name: /Station ID/ })
    expect(Number.parseFloat(sliver.style.width)).toBeCloseTo(MIN_BLOCK_PCT, 5)
  })
})
