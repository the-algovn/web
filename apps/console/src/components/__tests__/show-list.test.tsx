import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { type Segment, type Timeline, toTimeline } from "../../lib/show-timeline"
import { ShowList } from "../show-list"

function seg(over: Partial<Segment> = {}): Segment {
  return {
    id: "x", kind: "track", certainty: "aired", title: "T", artist: "",
    thumbnailUrl: "", startedAtMs: Date.parse("2026-09-07T08:00:00Z"), durationMs: 180_000,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0, forced: false,
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
  pageSize: 50,
  onPage: () => {},
  onSkip: () => {},
  onMove: () => {},
  onRemove: () => {},
  onForceBreak: () => {},
  onCancelBreak: () => {},
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

  it("removes by request id, not segment id, once the operator confirms", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    const onRemove = vi.fn()
    render(<ShowList timeline={timeline()} {...props} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove First" }))
    expect(confirm).toHaveBeenCalledWith('Gỡ "First" khỏi hàng đợi?')
    expect(onRemove).toHaveBeenCalledWith("r1")
    confirm.mockRestore()
  })

  it("names an untitled request the same way in the controls and the confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const tl = timeline({ upcoming: [seg({ id: "req:r1", certainty: "committed", title: "", requestId: "r1" })] })
    render(<ShowList timeline={tl} {...props} />)
    // Raw s.title would announce "Remove " and leave two untitled rows with
    // indistinguishable accessible names.
    expect(screen.getByRole("button", { name: "Remove Untitled" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move Untitled earlier" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move Untitled later" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remove Untitled" }))
    expect(confirm).toHaveBeenCalledWith('Gỡ "Untitled" khỏi hàng đợi?')
    confirm.mockRestore()
  })

  it("does not remove when the operator declines the confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const onRemove = vi.fn()
    render(<ShowList timeline={timeline()} {...props} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove First" }))
    expect(confirm).toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it("pages the past against totalPast, which excludes the airing row", () => {
    const onPage = vi.fn()
    render(<ShowList timeline={timeline({ totalPast: 120 })} {...props} onPage={onPage} />)
    expect(screen.getByText(/of 120/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Older" }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it("pages against the size the hook actually polls with, not the default", () => {
    const onPage = vi.fn()
    render(<ShowList timeline={timeline({ totalPast: 120 })} {...props} pageSize={25} onPage={onPage} />)
    expect(screen.getByText(/page 1 \/ 5 of 120/)).toBeInTheDocument()
  })

  it("keeps the pager sane when the server's totalPast will not parse", () => {
    // Fed through the real boundary: without toTimeline's guard, pageCount is
    // NaN, Older never disables, and the pager reads "page 1 / NaN of NaN".
    render(<ShowList timeline={toTimeline({ totalPast: "not-a-number" })} {...props} />)
    expect(screen.getByRole("button", { name: "Older" })).toBeDisabled()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
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
    expect(screen.getByText("No running order - the station is off air.")).toBeInTheDocument()
  })

  it("does not blame the station for an empty running order the gate does not explain", () => {
    // upcoming can empty for reasons the gate never reports; asserting "off
    // air" against an `ok` gate would state a fact this view never checked.
    render(<ShowList timeline={timeline({ upcoming: [], breakGate: "ok" })} {...props} />)
    expect(screen.getByText("No running order to show.")).toBeInTheDocument()
    expect(screen.queryByText(/off air/i)).not.toBeInTheDocument()
  })

  it("offers Noi ngay whenever the gate is ok", () => {
    const onForce = vi.fn()
    render(<ShowList timeline={timeline({ breakGate: "ok" })} {...props} onForceBreak={onForce} />)

    const btn = screen.getByRole("button", { name: /Nói ngay/ })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(onForce).toHaveBeenCalledTimes(1)
  })

  it("disables Noi ngay when the gate is shut and says why", () => {
    render(<ShowList timeline={timeline({ breakGate: "no_listeners" })} {...props} />)

    expect(screen.getByRole("button", { name: /Nói ngay/ })).toBeDisabled()
    expect(screen.getByText(/Nobody listening/)).toBeInTheDocument()
  })

  it("offers an always-enabled Huy on the strip when the gate is shut", () => {
    const onCancel = vi.fn()
    render(<ShowList timeline={timeline({ breakGate: "no_listeners" })} {...props} onCancelBreak={onCancel} />)

    const strip = screen.getByRole("region", { name: "Break controls" })
    expect(within(strip).getByRole("button", { name: /Nói ngay/ })).toBeDisabled()
    const cancel = within(strip).getByRole("button", { name: /Hủy/ })
    expect(cancel).toBeEnabled()
    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("has no strip-level Huy when the gate is ok", () => {
    render(<ShowList timeline={timeline({ breakGate: "ok" })} {...props} />)

    const strip = screen.getByRole("region", { name: "Break controls" })
    expect(within(strip).queryByRole("button", { name: /Hủy/ })).toBeNull()
  })

  it("offers Huy on a forced due break", () => {
    const onCancel = vi.fn()
    const forced = { ...seg({ id: "d1", kind: "dj", certainty: "due" }), forced: true }
    render(
      <ShowList timeline={timeline({ breakGate: "ok", upcoming: [forced] })} {...props} onCancelBreak={onCancel} />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Hủy/ }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("offers Huy on a prepared break even when not forced", () => {
    const prepared = { ...seg({ id: "p1", kind: "dj", certainty: "prepared" }), forced: false }
    render(<ShowList timeline={timeline({ breakGate: "ok", upcoming: [prepared] })} {...props} />)

    expect(screen.getByRole("button", { name: /Hủy/ })).toBeInTheDocument()
  })

  // A cadence-owed break is not cancellable in any meaningful sense - the
  // cadence re-arms it on the next tick, so the button would be a lie.
  it("does not offer Huy on a cadence-due break", () => {
    const cadence = { ...seg({ id: "d2", kind: "dj", certainty: "due" }), forced: false }
    render(<ShowList timeline={timeline({ breakGate: "ok", upcoming: [cadence] })} {...props} />)

    expect(screen.queryByRole("button", { name: /Hủy/ })).toBeNull()
  })
})
