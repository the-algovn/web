import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import App from "../App"
import { MockStudio } from "../lib/mock-studio"
import { createFakePlayer } from "../lib/player"

function onAir() {
  return screen.getByRole("region", { name: "Đang phát" })
}

function queue() {
  return screen.getByRole("region", { name: "Hàng đợi của đài" })
}

// The now-playing title only. The section also lists UP NEXT, so an
// unscoped query inside it would match a queued track too.
function playingTitle() {
  return within(onAir()).getByRole("heading", { level: 2 })
}

function goToTab(name: string) {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name }))
  })
}

function goToFilter(name: string) {
  act(() => {
    fireEvent.click(screen.getByRole("tab", { name }))
  })
}

// matchMedia reports matches:false in the setup file, so useIsDesktop() is
// false here: these exercise the phone shell - one view at a time behind the
// bottom nav.
describe("App (integration, mock studio)", () => {
  // Restored here, not at the end of the test body: a failing assertion would
  // otherwise leave fake timers installed and hang every later test.
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the on-air view and flips it on the virtual clock", async () => {
    vi.useFakeTimers()
    let t = 1_700_000_000_000
    const clock = () => t
    const client = new MockStudio({ now: clock, random: () => 0.5 })
    render(
      <App
        deps={{
          client,
          createPlayer: () => createFakePlayer(),
          playheadClock: clock,
        }}
      />,
    )

    // Flush the initial fetches. Fake timers break findBy* polling, so every
    // assertion below is synchronous.
    await act(async () => {
      await Promise.resolve()
    })

    // (a) station identity and the now-playing block are wired up.
    expect(screen.getByText("TIỂU DƯƠNG DƯƠNG TRỰC ĐÀI")).toBeInTheDocument()
    expect(within(onAir()).getByRole("progressbar")).toBeInTheDocument()
    expect(playingTitle()).toHaveTextContent("Em Của Ngày Hôm Qua")

    // (b) play routes through state.play() and the lamp lights — item 0
    // carries a dedication, so deriveStationState resolves to "on-air".
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Phát" }))
    })
    expect(screen.getByText("ON AIR")).toBeInTheDocument()

    // (c) advance past item 0's duration plus one ear-sync tick: the view
    // flips to the DJ slot.
    const first = await client.getNowPlaying()
    t += (first.durationSeconds + 1) * 1000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(playingTitle()).toHaveTextContent("tâm sự")

    // (d) the track that just finished has accrued into JUST PLAYED.
    goToTab("HÀNG ĐỢI")
    goToFilter("VỪA PHÁT")
    expect(within(queue()).getByText("Em Của Ngày Hôm Qua")).toBeInTheDocument()
  })

  it("moves between the three areas from the bottom nav", async () => {
    const client = new MockStudio({
      now: () => 1_700_000_000_000,
      random: () => 0.5,
    })
    render(
      <App
        deps={{
          client,
          createPlayer: () => createFakePlayer(),
          playheadClock: () => 1_700_000_000_000,
        }}
      />,
    )
    await act(async () => {
      await Promise.resolve()
    })

    expect(onAir()).toBeInTheDocument()

    goToTab("YÊU CẦU")
    expect(
      screen.getByRole("region", { name: "Yêu cầu bài hát" }),
    ).toBeInTheDocument()

    goToTab("HÀNG ĐỢI")
    expect(queue()).toBeInTheDocument()
    // The queue withholds a pending dedication's words; it only says one is
    // on its way.
    expect(within(queue()).getAllByText(/CÓ LỜI NHẮN/).length).toBeGreaterThan(0)
    expect(within(queue()).queryByText(/Gửi Ngọc/)).not.toBeInTheDocument()
  })

  it("invites an anonymous listener to sign in", async () => {
    const client = new MockStudio({
      now: () => 1_700_000_000_000,
      random: () => 0.5,
    })
    render(
      <App
        deps={{
          client,
          createPlayer: () => createFakePlayer(),
          playheadClock: () => 1_700_000_000_000,
        }}
      />,
    )
    expect(
      await screen.findByRole("button", { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })
})
