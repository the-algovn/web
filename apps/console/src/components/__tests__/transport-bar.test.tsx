import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TransportBar } from "../transport-bar"

const base = {
  status: "playing" as const,
  currentTime: 42,
  duration: 240,
  volume: 1,
  canPrev: false,
  canNext: true,
  onToggle: vi.fn(),
  onSeek: vi.fn(),
  onVolume: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
}

describe("TransportBar", () => {
  it("shows the loaded track, time, and a Pause control while playing", () => {
    render(<TransportBar {...base} track={{ ytId: "a", title: "One", channel: "Chan" }} />)
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("0:42")).toBeInTheDocument()
    expect(screen.getByText("4:00")).toBeInTheDocument()
    expect(screen.getByLabelText("Pause")).toBeInTheDocument()
  })

  it("disables Previous when canPrev is false and calls onToggle", () => {
    render(<TransportBar {...base} track={{ ytId: "a", title: "One" }} />)
    expect(screen.getByLabelText("Previous")).toBeDisabled()
    expect(screen.getByLabelText("Next")).not.toBeDisabled()
    fireEvent.click(screen.getByLabelText("Pause"))
    expect(base.onToggle).toHaveBeenCalled()
  })

  it("renders a Play control when paused", () => {
    render(<TransportBar {...base} status="paused" track={{ ytId: "a", title: "One" }} />)
    expect(screen.getByLabelText("Play")).toBeInTheDocument()
  })

  it("shows a placeholder when nothing is loaded", () => {
    render(<TransportBar {...base} track={null} />)
    expect(screen.getByText("Nothing playing")).toBeInTheDocument()
  })
})
