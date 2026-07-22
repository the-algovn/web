import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { NowPlaying } from "../../lib/radio-client"
import { NowPlayingCard } from "../now-playing"

const base: NowPlaying = {
  kind: "track",
  title: "Em Của Ngày Hôm Qua",
  artist: "Sơn Tùng M-TP",
  startedAt: "2026-07-20T16:41:00Z",
  durationSeconds: 258,
  listeners: 17,
}

describe("NowPlayingCard", () => {
  it("shows title, artist and the dedication when present", () => {
    render(
      <NowPlayingCard
        np={{ ...base, dedication: "🌙 Gửi Ngọc — chúc ngủ ngon nha" }}
      />,
    )
    expect(screen.getByText("Em Của Ngày Hôm Qua")).toBeInTheDocument()
    expect(screen.getByText("Sơn Tùng M-TP")).toBeInTheDocument()
    expect(screen.getByText(/Gửi Ngọc/)).toBeInTheDocument()
  })
  it("omits the dedication block when there is none", () => {
    render(<NowPlayingCard np={base} />)
    expect(screen.queryByText(/Gửi/)).not.toBeInTheDocument()
  })
  it("shows a loading label when null", () => {
    const { container } = render(<NowPlayingCard np={null} />)
    expect(screen.getByText(/Now playing/i)).toBeInTheDocument()
    expect(screen.queryByText(base.title)).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })
  it("renders attribution for AI picks, listener requests, and nothing for shuffle", () => {
    const base = {
      kind: "track" as const, title: "T", startedAt: "2026-07-22T05:00:00Z",
      durationSeconds: 240, listeners: 1,
    }
    const { rerender } = render(
      <NowPlayingCard np={{ ...base, source: "ai", reason: "hợp đêm mưa" }} />,
    )
    expect(screen.getByText("Tiểu Dương Dương chọn: hợp đêm mưa")).toBeInTheDocument()

    rerender(<NowPlayingCard np={{ ...base, source: "ai" }} />)
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument()

    rerender(<NowPlayingCard np={{ ...base, source: "listener", requestedByName: "Ngọc" }} />)
    expect(screen.getByText("Yêu cầu của Ngọc")).toBeInTheDocument()

    rerender(<NowPlayingCard np={{ ...base, source: "listener" }} />)
    expect(screen.getByText("Yêu cầu của thính giả")).toBeInTheDocument()

    rerender(<NowPlayingCard np={base} />)
    expect(screen.queryByText(/Tiểu Dương Dương chọn|Yêu cầu của/)).not.toBeInTheDocument()
  })
})
