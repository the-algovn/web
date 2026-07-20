import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "../App"
import { MockStudio } from "../lib/mock-studio"
import { createFakePlayer } from "../lib/player"

function nowPlayingRegion() {
  return screen.getByRole("region", { name: /now playing/i })
}

describe("App (integration, mock studio)", () => {
  it("renders the rail and feed and flips now-playing on the virtual clock", async () => {
    vi.useFakeTimers()
    let t = 1_700_000_000_000
    const clock = () => t
    const client = new MockStudio({ now: clock, random: () => 0.5 })
    const deps = {
      client,
      createPlayer: () => createFakePlayer(),
      playheadClock: clock,
    }
    render(<App deps={deps} />)

    // Flush the initial data fetches (getNowPlaying/getQueue/getHistory) —
    // React runs the mount effects synchronously as part of `render`/`act`,
    // so the rail + feed are already hydrated once this settles. (Fake timers
    // break `findByText`'s polling here, so assertions below use the
    // synchronous `getByText` instead of awaiting a find.)
    await act(async () => {
      await Promise.resolve()
    })

    // (a) rail + feed rendered with mock data.
    expect(screen.getByText("Tiểu Dương Dương")).toBeInTheDocument()
    // Scope to the now-playing card specifically: item 1's title ("...tâm
    // sự") is ALSO in the "Up next" queue from the very first render (queue
    // shows index+1..+3), so an unscoped getByText(/tâm sự/) would be a
    // tautology that passes even if the ear-sync flip is broken. Assert
    // within the "Now playing" region only.
    let region = nowPlayingRegion()
    expect(within(region).getByText("Em Của Ngày Hôm Qua")).toBeInTheDocument()
    expect(within(region).queryByText(/tâm sự/)).not.toBeInTheDocument()

    // (b) clicking play routes through state.play() -> the lamp lights ON AIR
    // (item 0 carries a dedication, so once the fake player reports "playing"
    // deriveStationState resolves to "on-air").
    const playButton = screen.getByRole("button", { name: "Play" })
    act(() => {
      fireEvent.click(playButton)
    })
    expect(screen.getByText("ON AIR")).toBeInTheDocument()

    // (c) advance the virtual clock past item 0's duration + one ear-sync
    // tick: the now-playing CARD flips to item 1, the DJ slot "Tiểu Dương
    // Dương tâm sự" — and item 0 leaves the card (it moves into History,
    // where it's expected to remain in the DOM).
    const firstNp = await client.getNowPlaying()
    t += (firstNp.durationSeconds + 1) * 1000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    region = nowPlayingRegion()
    expect(within(region).getByText(/tâm sự/)).toBeInTheDocument()
    expect(
      within(region).queryByText("Em Của Ngày Hôm Qua"),
    ).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
