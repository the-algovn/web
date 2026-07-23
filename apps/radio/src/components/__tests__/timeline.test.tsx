import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TimelineEntry, TimelineState } from "../../lib/timeline"
import { Timeline } from "../timeline"

const e = (title: string, over: Partial<TimelineEntry> = {}): TimelineEntry => ({
  key: title,
  zone: "future",
  title,
  witnessed: false,
  ...over,
})

const state = (over: Partial<TimelineState> = {}): TimelineState => ({
  pending: [],
  future: [],
  current: null,
  past: [],
  ...over,
})

function titlesInOrder(): string[] {
  // Not filtered by { expanded: false }: none of these rows carry a
  // reason/dedication/artist, so aria-expanded is correctly omitted
  // (hasDetail false) rather than reporting a collapsed state.
  return screen.getAllByRole("button").map((b) => b.textContent ?? "")
}

describe("Timeline", () => {
  it("renders furthest-future first, then the marker, then most-recent past", () => {
    render(
      <Timeline
        state={state({
          pending: [e("pending1", { zone: "pending", key: "p1" })],
          future: [e("near"), e("far")],
          current: e("live", { zone: "current", key: "c" }),
          past: [e("recent", { zone: "past", key: "r" }), e("older", { zone: "past", key: "o" })],
        })}
        elapsedS={10}
        remainingS={20}
      />,
    )
    const order = titlesInOrder()
    expect(order[0]).toContain("pending1")
    expect(order[1]).toContain("far")
    expect(order[2]).toContain("near")
    expect(order[3]).toContain("recent")
    expect(order[4]).toContain("older")
    expect(screen.getByText("ĐANG PHÁT")).toBeInTheDocument()
  })

  it("does not render the current entry as a row — the stage already shows it", () => {
    render(
      <Timeline
        state={state({ current: e("live", { zone: "current", key: "c" }) })}
        elapsedS={0}
        remainingS={0}
      />,
    )
    expect(screen.queryByText("live")).not.toBeInTheDocument()
  })

  it("explains an empty queue rather than showing blank space", () => {
    render(<Timeline state={state()} elapsedS={0} remainingS={0} />)
    expect(screen.getByText("đài đang chọn bài…")).toBeInTheDocument()
  })

  it("explains an empty past", () => {
    render(<Timeline state={state()} elapsedS={0} remainingS={0} />)
    expect(screen.getByText("chưa có bài nào phát trong phiên này")).toBeInTheDocument()
  })

  it("labels the scroll region for assistive tech without making it a live region", () => {
    render(<Timeline state={state()} elapsedS={0} remainingS={0} />)
    const region = screen.getByRole("region", { name: "Dòng thời gian của đài" })
    expect(region).not.toHaveAttribute("aria-live")
  })
})
