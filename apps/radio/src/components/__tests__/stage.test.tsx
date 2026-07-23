import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { NowPlaying } from "../../lib/radio-client"
import { PlayerControls } from "../player-controls"
import { Stage } from "../stage"
import { StationHeader } from "../station-header"

const np: NowPlaying = {
  kind: "track",
  title: "Chúng Ta Của Tương Lai",
  artist: "Sơn Tùng M-TP",
  startedAt: "2026-07-23T10:00:00.000Z",
  durationSeconds: 200,
  listeners: 7,
}

const noop = () => {}

const stageProps = {
  nowPlaying: np,
  status: "music-only" as const,
  progress: { elapsedS: 50, remainingS: 150, fraction: 0.25 },
  playerState: "playing" as const,
  volumeControllable: true,
  signedIn: true,
  onPlay: noop,
  onPause: noop,
  onVolume: noop,
  onMute: noop,
  onRequest: noop,
  onSignIn: noop,
}

describe("StationHeader", () => {
  it("shows the station identity, the lamp and the listener count", () => {
    render(<StationHeader status="on-air" mode="live" listeners={7} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("ON AIR")).toBeInTheDocument()
    expect(screen.getByLabelText("7 người đang nghe")).toBeInTheDocument()
  })

  it("surfaces a degraded connection alongside the lamp", () => {
    render(<StationHeader status="on-air" mode="polling" listeners={2} />)
    expect(screen.getByText("đang cập nhật chậm")).toBeInTheDocument()
  })
})

describe("PlayerControls", () => {
  it("offers pause while playing and calls back", async () => {
    const onPause = vi.fn()
    render(
      <PlayerControls
        playerState="playing"
        volumeControllable
        onPlay={noop}
        onPause={onPause}
        onVolume={noop}
        onMute={noop}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Tạm dừng" }))
    expect(onPause).toHaveBeenCalledOnce()
  })

  it("shows a volume slider when volume can be controlled", () => {
    render(
      <PlayerControls
        playerState="playing"
        volumeControllable
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
        onMute={noop}
      />,
    )
    expect(screen.getByLabelText("Âm lượng")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /tắt tiếng/i })).not.toBeInTheDocument()
  })

  it("replaces the dead slider with a mute toggle on iOS", async () => {
    const onMute = vi.fn()
    render(
      <PlayerControls
        playerState="playing"
        volumeControllable={false}
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
        onMute={onMute}
      />,
    )
    expect(screen.queryByLabelText("Âm lượng")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }))
    expect(onMute).toHaveBeenCalledWith(true)
  })

  it("shows a busy indicator while connecting", () => {
    render(
      <PlayerControls
        playerState="connecting"
        volumeControllable
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
        onMute={noop}
      />,
    )
    expect(screen.getByRole("button", { name: "Đang kết nối" })).toBeDisabled()
  })
})

describe("Stage", () => {
  it("shows the track, its credit and the progress clock", () => {
    render(<Stage {...stageProps} nowPlaying={{ ...np, source: "ai" }} />)
    expect(screen.getByText("Chúng Ta Của Tương Lai")).toBeInTheDocument()
    expect(screen.getByText("Sơn Tùng M-TP")).toBeInTheDocument()
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument()
    expect(screen.getByText("0:50")).toBeInTheDocument()
    expect(screen.getByText("-2:30")).toBeInTheDocument()
  })

  it("reads out the dedication of the track on air", () => {
    render(
      <Stage {...stageProps} nowPlaying={{ ...np, dedication: "gửi Linh" }} />,
    )
    expect(screen.getByText("gửi Linh")).toBeInTheDocument()
  })

  it("announces the current title politely, and only the title", () => {
    render(<Stage {...stageProps} />)
    const live = screen.getByText("Chúng Ta Của Tương Lai")
    expect(live).toHaveAttribute("aria-live", "polite")
  })

  it("asks an anonymous listener to sign in instead of requesting", async () => {
    const onSignIn = vi.fn()
    render(<Stage {...stageProps} signedIn={false} onSignIn={onSignIn} />)
    await userEvent.click(screen.getByRole("button", { name: /đăng nhập/i }))
    expect(onSignIn).toHaveBeenCalledOnce()
  })

  it("shows an off-air state rather than blank space", () => {
    render(<Stage {...stageProps} nowPlaying={null} status="off-air" />)
    expect(screen.getByText("đài đang nghỉ")).toBeInTheDocument()
  })

  it("distinguishes still-connecting from off-air", () => {
    render(
      <Stage {...stageProps} nowPlaying={null} status="connecting" />,
    )
    // Connecting means "we don't know yet" — never claim the station is off.
    expect(screen.queryByText("đài đang nghỉ")).not.toBeInTheDocument()
    expect(screen.getByLabelText("đang dò sóng")).toBeInTheDocument()
  })
})
