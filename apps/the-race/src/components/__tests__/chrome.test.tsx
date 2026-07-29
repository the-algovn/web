import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Chrome } from "../chrome"

const props = {
  title: "Ai rửa bát tối nay?",
  seedCommit: "af14b4527b604a230bdcf172bb17930ac177a142f",
  live: true,
  tMs: 12_340,
  durationMs: 24_000,
  caption: "Minh bơi vọt lên!",
  muted: false,
  voiced: 9,
  showClock: true,
  onToggleMute: () => {},
}

describe("Chrome", () => {
  it("presents the seal as a credential, not a padlock", () => {
    render(<Chrome {...props} />)
    expect(screen.getByText(/ĐÃ NIÊM PHONG/)).toBeInTheDocument()
    expect(screen.getByText(/af14b452/)).toBeInTheDocument()
  })

  it("shows a running clock in seconds", () => {
    render(<Chrome {...props} />)
    expect(screen.getByText("12.3s")).toBeInTheDocument()
  })

  it("shows no clock before the gun", () => {
    // Nothing has been timed yet, and a clock reading 0.0s through the whole
    // pre-race invites the reading that the race has started and nobody moved.
    render(<Chrome {...props} showClock={false} tMs={0} />)
    expect(screen.queryByText("0.0s")).not.toBeInTheDocument()
  })

  it("marks itself live only while the race is running", () => {
    const { rerender } = render(<Chrome {...props} />)
    expect(screen.getByText("LIVE")).toBeInTheDocument()
    rerender(<Chrome {...props} live={false} />)
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument()
  })

  it("keeps the caption rail announced but never assertive", () => {
    // aria-live=polite: an assertive rail interrupts a screen reader mid-word on
    // every line, which in a 30-second race is unusable.
    render(<Chrome {...props} />)
    const rail = screen.getByText(/Minh bơi vọt lên/)
    expect(rail.closest("[aria-live]")).toHaveAttribute("aria-live", "polite")
  })

  it("offers no mute control for a race with no audio at all", () => {
    render(<Chrome {...props} voiced={0} />)
    expect(screen.queryByRole("button", { name: /tiếng/i })).not.toBeInTheDocument()
  })
})
