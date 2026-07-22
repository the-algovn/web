import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NowPlayingCard } from "../now-playing-card"

const np = {
  kind: "track", title: "Lạc Trôi", artist: "Sơn Tùng M-TP - Topic",
  startedAt: "2026-07-22T09:00:00Z", durationSeconds: 240, listeners: 3,
}

describe("NowPlayingCard", () => {
  it("renders title, artist and provenance for an AI pick", () => {
    render(
      <NowPlayingCard np={{ ...np, source: "ai", reason: "hợp đêm mưa" }} busy={false} onSkip={vi.fn()} />,
    )
    expect(screen.getByText("Lạc Trôi")).toBeInTheDocument()
    expect(screen.getByText("Tiểu Dương Dương chọn: hợp đêm mưa")).toBeInTheDocument()
  })

  it("renders listener attribution and fires skip", () => {
    const skip = vi.fn()
    render(
      <NowPlayingCard np={{ ...np, source: "listener", requestedByName: "Ngọc" }} busy={false} onSkip={skip} />,
    )
    expect(screen.getByText("Yêu cầu của Ngọc")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Skip" }))
    expect(skip).toHaveBeenCalled()
  })

  it("shows the off-air empty state without a skip button", () => {
    render(<NowPlayingCard np={null} busy={false} onSkip={vi.fn()} />)
    expect(screen.getByText("Nothing airing.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument()
  })
})
