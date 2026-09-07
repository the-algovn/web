import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  hhmm,
  MIN_BLOCK_PCT,
  type Segment,
  type Timeline,
  WINDOW_AFTER_MS,
  WINDOW_BEFORE_MS,
} from "../../lib/show-timeline"
import { ShowRibbon } from "../show-ribbon"

const NOW = Date.parse("2026-09-07T09:00:00Z")

function seg(over: Partial<Segment> = {}): Segment {
  return {
    id: "x", kind: "track", certainty: "aired", title: "T", artist: "",
    thumbnailUrl: "", startedAtMs: NOW, durationMs: 180_000,
    source: "", requestedByName: "", reason: "", requestId: "", status: "",
    script: "", backsellTitle: "", promiseTitle: "", correlationId: "",
    model: "", inTokens: 0, outTokens: 0, costUsd: 0, latencyMs: 0, forced: false,
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

  it("names an untitled track the same as the list does, not Shuffle", () => {
    const tl = timeline({
      upcoming: [seg({ id: "req:r1", kind: "track", certainty: "projected", title: "", startedAtMs: NOW + 60_000 })],
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByRole("button", { name: /^Untitled/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Shuffle/ })).not.toBeInTheDocument()
  })

  it("labels the axis from the window constants the geometry uses", () => {
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByText(hhmm(NOW - WINDOW_BEFORE_MS))).toBeInTheDocument()
    expect(screen.getByText(hhmm(NOW + WINDOW_AFTER_MS))).toBeInTheDocument()
  })

  it("places the playhead at 40% of the window", () => {
    render(<ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByTestId("playhead").style.left).toBe("40%")
  })

  it("omits a segment outside the window but does not crash", () => {
    const tl = timeline({ past: [seg({ id: "air:1", startedAtMs: NOW - 3 * 60 * 60_000, title: "Ancient" })] })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.queryByRole("button", { name: /Ancient/ })).not.toBeInTheDocument()
    // Proves selective omission, not a render failure that drops everything.
    expect(screen.getByRole("button", { name: /Now/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument()
  })

  it("keeps a background on a projected unknown block - the certainty suffix must not clash with the kind's own opacity suffix", () => {
    const tl = timeline({
      upcoming: [seg({ id: "shuffle:1", kind: "unknown", certainty: "unknown", title: "", startedAtMs: NOW + 60_000 })],
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const block = screen.getByRole("button", { name: /Shuffle/ })
    // bg-muted-foreground/30 (kind) plus a second /NN (certainty) suffix, e.g.
    // bg-muted-foreground/30/50, matches no Tailwind grammar and emits no rule.
    expect(block.className).not.toMatch(/\/\d+\/\d+/)
    expect(block.className).toMatch(/\bopacity-50\b/)
  })

  it("keeps the same DOM node for an unchanged segment across a poll (key = segment id, not array index)", () => {
    const { rerender } = render(
      <ShowRibbon timeline={timeline()} nowMs={NOW} selectedId={null} onSelect={() => {}} />,
    )
    const before = screen.getByRole("button", { name: /Now/ })
    // A fresh timeline object with an extra past segment ahead of "Older"
    // shifts every later segment's array position - the case an index key
    // gets wrong and a segment-id key gets right.
    const shifted = timeline({
      past: [
        seg({ id: "air:7", startedAtMs: NOW - 600_000, title: "Oldest" }),
        seg({ id: "air:8", startedAtMs: NOW - 300_000, title: "Older" }),
      ],
    })
    rerender(<ShowRibbon timeline={shifted} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByRole("button", { name: /Now/ })).toBe(before)
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

  it("does not draw a prepared clip the same as a due cadence guess", () => {
    const tl = timeline({
      upcoming: [
        seg({ id: "prep:1", kind: "dj", certainty: "prepared", title: "Scripted break", startedAtMs: NOW + 60_000 }),
        seg({ id: "due:1", kind: "dj", certainty: "due", title: "", startedAtMs: NOW + 300_000 }),
      ],
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const prepared = screen.getByRole("button", { name: /Scripted break/ })
    const due = screen.getByRole("button", { name: /DJ break/ })

    expect(prepared.className).not.toBe(due.className)
    // A rendered, paid-for clip is the strongest projection and carries the
    // marker - but it is still a projection, see the fact-weight test below.
    expect(prepared.className).toMatch(/\bopacity-75\b/)
    expect(within(prepared).getByTestId("prepared-marker")).toBeInTheDocument()
    // A cadence guess is faded, dashed, and unmarked.
    expect(due.className).toMatch(/\bborder-dashed\b/)
    expect(due.className).toMatch(/\bopacity-30\b/)
    expect(within(due).queryByTestId("prepared-marker")).not.toBeInTheDocument()
  })

  it("never draws a prepared clip at fact weight - it can still evaporate at Take", () => {
    // Same kind on purpose: the base colour is identical, so the only thing
    // that can separate them is the certainty treatment itself. An opacity
    // class that resolves to the inherited default is not a separation.
    const tl = timeline({
      past: [seg({ id: "air:8", kind: "dj", certainty: "aired", title: "Aired break", startedAtMs: NOW - 300_000 })],
      airing: null,
      upcoming: [seg({ id: "prep:1", kind: "dj", certainty: "prepared", title: "Prepared break", startedAtMs: NOW + 60_000 })],
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const aired = screen.getByRole("button", { name: /Aired break/ })
    const prepared = screen.getByRole("button", { name: /Prepared break/ })

    // Strip the marker out of the comparison: the block itself must differ, not
    // just the 6px aria-hidden diamond sitting on top of it.
    const airedClasses = new Set(aired.className.split(/\s+/))
    const preparedOnly = prepared.className.split(/\s+/).filter((c) => c && !airedClasses.has(c))
    expect(preparedOnly).toContain("opacity-75")
    expect(preparedOnly).not.toContain("opacity-100")
  })

  it("grades the projections down the ladder, with facts above all of them", () => {
    const rungs = ["committed", "prepared", "projected", "due"]
    const tl = timeline({
      past: [seg({ id: "air:8", kind: "dj", certainty: "aired", title: "aired", startedAtMs: NOW - 300_000 })],
      airing: null,
      upcoming: rungs.map((c, i) =>
        seg({ id: `rung:${c}`, kind: "dj", certainty: c, title: c, startedAtMs: NOW + (i + 1) * 120_000 }),
      ),
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const opacityOf = (name: string) => {
      const hit = screen.getByRole("button", { name: new RegExp(`^${name} `) }).className.match(/\bopacity-(\d+)\b/)
      // A fact carries no opacity class at all, which is full weight.
      return hit?.[1] ? Number(hit[1]) : 100
    }

    expect(opacityOf("aired")).toBe(100)
    expect(rungs.map(opacityOf)).toEqual([90, 75, 50, 30])
  })

  it("does not draw the pinned next-up the same as a plain projection", () => {
    const tl = timeline({
      upcoming: [
        seg({ id: "req:c", certainty: "committed", title: "Pinned", startedAtMs: NOW + 60_000 }),
        seg({ id: "req:p", certainty: "projected", title: "Later", startedAtMs: NOW + 300_000 }),
      ],
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const committed = screen.getByRole("button", { name: /Pinned/ })
    const projected = screen.getByRole("button", { name: /Later/ })

    expect(committed.className).not.toBe(projected.className)
    expect(committed.className).toMatch(/\bborder-solid\b/)
    expect(projected.className).toMatch(/\bborder-dotted\b/)
  })

  it("keeps every rung's treatment a real Tailwind class, not a doubled opacity suffix", () => {
    const rungs = ["committed", "prepared", "projected", "due", "unknown"]
    const tl = timeline({
      upcoming: rungs.map((c, i) =>
        seg({ id: `rung:${c}`, kind: "unknown", certainty: c, title: c, startedAtMs: NOW + (i + 1) * 60_000 }),
      ),
    })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    for (const c of rungs) {
      expect(screen.getByRole("button", { name: new RegExp(c) }).className).not.toMatch(/\/\d+\/\d+/)
    }
  })

  it("floors a 12s station ID at the minimum width so it stays clickable", () => {
    // 12s of a 50-minute window is 0.4%, about three pixels at 800px wide.
    const tl = timeline({ upcoming: [seg({ id: "proj:station_id:0", kind: "station_id", certainty: "due", title: "", startedAtMs: NOW + 60_000, durationMs: 12_000 })] })
    render(<ShowRibbon timeline={tl} nowMs={NOW} selectedId={null} onSelect={() => {}} />)
    const sliver = screen.getByRole("button", { name: /Station ID/ })
    expect(Number.parseFloat(sliver.style.width)).toBeCloseTo(MIN_BLOCK_PCT, 5)
  })
})
