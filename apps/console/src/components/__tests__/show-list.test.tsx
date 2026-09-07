import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Segment, Timeline } from "../../lib/show-timeline"
import { ShowList } from "../show-list"

function seg(over: Partial<Segment> = {}): Segment {
  return {
    id: "x", kind: "track", certainty: "aired", title: "T", artist: "",
    thumbnailUrl: "", startedAtMs: Date.parse("2026-09-07T08:00:00Z"), durationMs: 180_000,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0,
    ...over,
  }
}

function timeline(over: Partial<Timeline> = {}): Timeline {
  return {
    past: [seg({ id: "air:8", title: "Bolero Night" })],
    airing: seg({ id: "air:9", certainty: "airing", title: "Now" }),
    upcoming: [
      seg({ id: "req:r1", certainty: "committed", title: "First", requestId: "r1" }),
      seg({ id: "req:r2", certainty: "projected", title: "Second", requestId: "r2" }),
    ],
    staging: [],
    sessions: [],
    breakGate: "ok",
    totalPast: 1,
    serverNowMs: Date.parse("2026-09-07T08:01:00Z"),
    ...over,
  }
}

const props = {
  nowMs: Date.parse("2026-09-07T08:01:00Z"),
  selectedId: null as string | null,
  onSelect: () => {},
  busy: false,
  page: 0,
  onPage: () => {},
  onSkip: () => {},
  onMove: () => {},
  onRemove: () => {},
}

describe("ShowList", () => {
  it("groups into on air, coming up and already aired", () => {
    render(<ShowList timeline={timeline()} {...props} />)
    expect(within(screen.getByRole("region", { name: "On air" })).getByText("Now")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Coming up" })).getByText("First")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Already aired" })).getByText("Bolero Night")).toBeInTheDocument()
  })

  it("explains why no break is coming when the gate is not ok", () => {
    render(<ShowList timeline={timeline({ breakGate: "no_listeners" })} {...props} />)
    expect(screen.getByText(/Nobody listening/)).toBeInTheDocument()
  })

  it("offers Skip on the airing row only", () => {
    render(<ShowList timeline={timeline()} {...props} />)
    expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(1)
  })

  it("names the request and a direction, and builds no id list of its own", () => {
    const onMove = vi.fn()
    render(<ShowList timeline={timeline()} {...props} onMove={onMove} />)
    fireEvent.click(screen.getByRole("button", { name: "Move First later" }))
    expect(onMove).toHaveBeenCalledWith("r1", 1)
    fireEvent.click(screen.getByRole("button", { name: "Move Second earlier" }))
    expect(onMove).toHaveBeenCalledWith("r2", -1)
    // The projection is not the reorder set, so nothing here may hand up ids.
    for (const call of onMove.mock.calls) {
      expect(Array.isArray(call[0])).toBe(false)
    }
  })

  it("offers reorder on the last upcoming row - the set it moves within is not this list", () => {
    // Under the old upcoming-derived list the bottom row could never move
    // later. The pending set is longer than the projection, so it can.
    const onMove = vi.fn()
    render(<ShowList timeline={timeline()} {...props} onMove={onMove} />)
    const later = screen.getByRole("button", { name: "Move Second later" })
    expect(later).not.toBeDisabled()
    fireEvent.click(later)
    expect(onMove).toHaveBeenCalledWith("r2", 1)
  })

  it("does not offer reorder controls on rows with no request id", () => {
    const tl = timeline({ upcoming: [seg({ id: "proj:dj:0", kind: "dj", certainty: "due", title: "" })] })
    render(<ShowList timeline={tl} {...props} />)
    expect(screen.queryByRole("button", { name: /^Move/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument()
  })

  it("removes by request id, not segment id", () => {
    const onRemove = vi.fn()
    render(<ShowList timeline={timeline()} {...props} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove First" }))
    expect(onRemove).toHaveBeenCalledWith("r1")
  })

  it("pages the past against totalPast, which excludes the airing row", () => {
    const onPage = vi.fn()
    render(<ShowList timeline={timeline({ totalPast: 120 })} {...props} onPage={onPage} />)
    expect(screen.getByText(/of 120/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Older" }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it("renders staging off the time axis", () => {
    const tl = timeline({ staging: [seg({ id: "req:r9", certainty: "staging", title: "Downloading", status: "approved" })] })
    render(<ShowList timeline={tl} {...props} />)
    const strip = screen.getByRole("region", { name: "Staging" })
    expect(within(strip).getByText("Downloading")).toBeInTheDocument()
    expect(within(strip).queryByTestId("segment-time")).not.toBeInTheDocument()
  })

  it("says so plainly when the station is off air", () => {
    render(<ShowList timeline={timeline({ airing: null, upcoming: [], breakGate: "off_air" })} {...props} />)
    expect(screen.getByText(/Nothing on air/)).toBeInTheDocument()
  })
})
