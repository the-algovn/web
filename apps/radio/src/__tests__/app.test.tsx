import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "../App"
import { MockStudio } from "../lib/mock-studio"
import { createFakePlayer } from "../lib/player"

describe("App (integration, mock studio)", () => {
  it("renders the rail and feed and flips now-playing on the virtual clock", async () => {
    vi.useFakeTimers()
    let t = 1_700_000_000_000
    const clock = () => t
    const client = new MockStudio({ now: clock, random: () => 0.5 })
    const deps = { client, createPlayer: () => createFakePlayer(), playheadClock: clock }
    render(<App deps={deps} />)

    // Flush the initial data fetches (getNowPlaying/getQueue/getHistory) —
    // React runs the mount effects synchronously as part of `render`/`act`,
    // so the rail + feed are already hydrated once this settles. (Fake timers
    // break `findByText`'s polling here, so assertions below use the
    // synchronous `getByText` instead of awaiting a find.)
    await act(async () => { await Promise.resolve() })

    // (a) rail + feed rendered with mock data.
    expect(screen.getByText("Tiểu Dương Dương")).toBeInTheDocument()
    expect(screen.getByText(/Em Của Ngày Hôm Qua/)).toBeInTheDocument()

    // (b) clicking play routes through state.play() -> the lamp lights ON AIR
    // (item 0 carries a dedication, so once the fake player reports "playing"
    // deriveStationState resolves to "on-air").
    const playButton = screen.getByRole("button", { name: "Play" })
    act(() => { fireEvent.click(playButton) })
    expect(screen.getByText("ON AIR")).toBeInTheDocument()

    // (c) advance the virtual clock past item 0's duration + one ear-sync
    // tick: now-playing flips to item 1, the DJ slot "Tiểu Dương Dương tâm sự".
    const firstNp = await client.getNowPlaying()
    t += (firstNp.durationSeconds + 1) * 1000
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })

    expect(screen.getByText(/tâm sự/)).toBeInTheDocument()

    vi.useRealTimers()
  })
})
