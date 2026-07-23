import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "../App"
import { MockStudio } from "../lib/mock-studio"
import { createFakePlayer } from "../lib/player"

function stage() {
  return screen.getByRole("region", { name: "Đang phát" })
}

function timeline() {
  return screen.getByRole("region", { name: "Dòng thời gian của đài" })
}

describe("App (integration, mock studio)", () => {
  it("renders the stage and timeline, and flips on the virtual clock", async () => {
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

    // (a) station identity, stage and timeline are wired up.
    expect(screen.getByText("Tiểu Dương Dương")).toBeInTheDocument()
    expect(timeline()).toBeInTheDocument()
    expect(within(stage()).getByRole("progressbar")).toBeInTheDocument()
    // Scope to the stage: item 1's title is also in the queue from the first
    // render, so an unscoped query would pass even with the ear-sync broken.
    expect(
      within(stage()).getByText("Em Của Ngày Hôm Qua"),
    ).toBeInTheDocument()
    expect(within(stage()).queryByText(/tâm sự/)).not.toBeInTheDocument()

    // (b) play routes through state.play() and the lamp lights — item 0
    // carries a dedication, so deriveStationState resolves to "on-air".
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Phát" }))
    })
    expect(screen.getByText("ON AIR")).toBeInTheDocument()

    // (c) advance past item 0's duration plus one ear-sync tick: the stage
    // flips to the DJ slot, and item 0 accrues into the timeline's past.
    const first = await client.getNowPlaying()
    t += (first.durationSeconds + 1) * 1000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(within(stage()).getByText(/tâm sự/)).toBeInTheDocument()
    expect(
      within(stage()).queryByText("Em Của Ngày Hôm Qua"),
    ).not.toBeInTheDocument()
    expect(
      within(timeline()).getByText("Em Của Ngày Hôm Qua"),
    ).toBeInTheDocument()

    vi.useRealTimers()
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
