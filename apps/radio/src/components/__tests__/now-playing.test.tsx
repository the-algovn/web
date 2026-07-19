import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NowPlayingCard } from "../now-playing"
import type { NowPlaying } from "../../lib/radio-client"

const base: NowPlaying = { kind: "track", title: "Em Của Ngày Hôm Qua", artist: "Sơn Tùng M-TP", startedAt: "2026-07-20T16:41:00Z", durationSeconds: 258, listeners: 17 }

describe("NowPlayingCard", () => {
  it("shows title, artist and the dedication when present", () => {
    render(<NowPlayingCard np={{ ...base, dedication: "🌙 Gửi Ngọc — chúc ngủ ngon nha" }} />)
    expect(screen.getByText("Em Của Ngày Hôm Qua")).toBeInTheDocument()
    expect(screen.getByText("Sơn Tùng M-TP")).toBeInTheDocument()
    expect(screen.getByText(/Gửi Ngọc/)).toBeInTheDocument()
  })
  it("omits the dedication block when there is none", () => {
    render(<NowPlayingCard np={base} />)
    expect(screen.queryByText(/Gửi/)).not.toBeInTheDocument()
  })
  it("shows a loading label when null", () => {
    render(<NowPlayingCard np={null} />)
    expect(screen.getByText(/Now playing/i)).toBeInTheDocument()
  })
})
