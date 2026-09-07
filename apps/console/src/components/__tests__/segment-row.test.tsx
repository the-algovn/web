import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { CERTAINTY_LABEL, type Segment } from "../../lib/show-timeline"
import { SegmentRow } from "../segment-row"

// SegmentRow renders an <li>; the listitem role needs a list parent.
const inList = (node: ReactNode) => render(<ul>{node}</ul>)

function seg(over: Partial<Segment> = {}): Segment {
  return {
    id: "air:1", kind: "track", certainty: "aired", title: "Bien Nho", artist: "TCS",
    thumbnailUrl: "", startedAtMs: Date.parse("2026-09-07T08:00:00Z"), durationMs: 200_000,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0, forced: false,
    ...over,
  }
}

const noop = () => {}

describe("SegmentRow", () => {
  it("marks each certainty distinctly", () => {
    const ladder = ["aired", "airing", "committed", "prepared", "projected", "due", "unknown", "staging"]
    for (const c of ladder) {
      const { unmount } = inList(<SegmentRow seg={seg({ certainty: c })} nowMs={0} expanded={false} onToggle={noop} />)
      expect(screen.getByRole("listitem")).toHaveAttribute("data-certainty", c)
      expect(screen.getByText(CERTAINTY_LABEL[c]!)).toBeInTheDocument()
      unmount()
    }
  })

  it("renders no title for an unknown shuffle block", () => {
    inList(<SegmentRow seg={seg({ kind: "unknown", certainty: "unknown", title: "" })} nowMs={0} expanded={false} onToggle={noop} />)
    expect(screen.getByText("Shuffle")).toBeInTheDocument()
  })

  it("says có thể có on a due break", () => {
    inList(<SegmentRow seg={seg({ kind: "dj", certainty: "due", title: "" })} nowMs={0} expanded={false} onToggle={noop} />)
    expect(screen.getByText("có thể có")).toBeInTheDocument()
  })

  it("prefixes a projected start with ~ and leaves a fact bare", () => {
    const at = Date.parse("2026-09-07T08:00:00Z")
    const { unmount } = inList(<SegmentRow seg={seg({ certainty: "projected", startedAtMs: at })} nowMs={at} expanded={false} onToggle={noop} />)
    expect(screen.getByTestId("segment-time").textContent).toMatch(/^~/)
    unmount()
    inList(<SegmentRow seg={seg({ certainty: "aired", startedAtMs: at })} nowMs={at} expanded={false} onToggle={noop} />)
    expect(screen.getByTestId("segment-time").textContent).not.toMatch(/^~/)
  })

  it("shows a progress bar only while airing", () => {
    const started = Date.parse("2026-09-07T08:00:00Z")
    const { unmount } = inList(
      <SegmentRow seg={seg({ certainty: "airing", startedAtMs: started, durationMs: 200_000 })} nowMs={started + 100_000} expanded={false} onToggle={noop} />,
    )
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50")
    unmount()
    inList(<SegmentRow seg={seg({ certainty: "aired" })} nowMs={started} expanded={false} onToggle={noop} />)
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("clamps progress bar at 0 and 100", () => {
    const started = Date.parse("2026-09-07T08:00:00Z")
    const duration = 200_000
    const { unmount } = inList(<SegmentRow seg={seg({ certainty: "airing", startedAtMs: started, durationMs: duration })} nowMs={started - 50_000} expanded={false} onToggle={noop} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    unmount()
    inList(<SegmentRow seg={seg({ certainty: "airing", startedAtMs: started, durationMs: duration })} nowMs={started + duration + 100_000} expanded={false} onToggle={noop} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it("reveals the script and provenance only when expanded", () => {
    const dj = seg({ kind: "dj", certainty: "aired", title: "", script: "Chào các bạn", model: "claude-haiku-4-5-20251001", costUsd: 0.0021, inTokens: 900, outTokens: 120, latencyMs: 830 })
    const { rerender } = render(<ul><SegmentRow seg={dj} nowMs={0} expanded={false} onToggle={noop} /></ul>)
    expect(screen.queryByText("Chào các bạn")).not.toBeInTheDocument()
    rerender(<ul><SegmentRow seg={dj} nowMs={0} expanded={true} onToggle={noop} /></ul>)
    expect(screen.getByText("Chào các bạn")).toBeInTheDocument()
    expect(screen.getByText(/claude-haiku-4-5/)).toBeInTheDocument()
    expect(screen.getByText(/0\.0021/)).toBeInTheDocument()
  })

  it("attributes a listener request and an AI pick", () => {
    const { unmount } = inList(<SegmentRow seg={seg({ source: "listener", requestedByName: "Ngọc" })} nowMs={0} expanded={false} onToggle={noop} />)
    expect(screen.getByText(/Ngọc/)).toBeInTheDocument()
    unmount()
    inList(<SegmentRow seg={seg({ source: "ai", reason: "khuya rồi" })} nowMs={0} expanded={false} onToggle={noop} />)
    expect(screen.getByText(/khuya rồi/)).toBeInTheDocument()
  })

  it("calls onToggle when the row is activated", () => {
    const onToggle = vi.fn()
    inList(<SegmentRow seg={seg()} nowMs={0} expanded={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole("button", { name: /Bien Nho/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
