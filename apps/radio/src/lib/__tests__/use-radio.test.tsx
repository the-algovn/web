import { act, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { describe, expect, it } from "vitest"
import { MockStudio } from "../mock-studio"
import { createFakePlayer } from "../player"
import type { NowPlaying, RadioClient } from "../radio-client"
import { useRadio } from "../use-radio"

function Harness({ clock }: { clock: () => number }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [client] = useState(
    () => new MockStudio({ now: clock, random: () => 0.5 }),
  )
  const [player] = useState(() => createFakePlayer())
  const state = useRadio(ref, {
    client,
    createPlayer: () => player,
    playheadClock: clock,
  })
  return (
    <div>
      {/* biome-ignore lint/a11y/useMediaCaption: test fixture audio element has no caption track */}
      <audio ref={ref} />
      <span data-testid="np">{state.nowPlaying?.title ?? "…"}</span>
      <span data-testid="listeners">{state.listeners}</span>
      <span data-testid="queue">{state.queue.length}</span>
    </div>
  )
}

describe("useRadio", () => {
  it("hydrates now-playing / queue / listeners from the client", async () => {
    const t = 1_700_000_000_000
    render(<Harness clock={() => t} />)
    await screen.findByText(/Em Của Ngày Hôm Qua/)
    expect(Number(screen.getByTestId("listeners").textContent)).toBeGreaterThan(
      0,
    )
    expect(Number(screen.getByTestId("queue").textContent)).toBeGreaterThan(0)
  })
})

// A minimal RadioClient whose now-playing subscription is driven manually, to
// exercise the off-air (null) signal without the mock studio's schedule.
const seedNp: NowPlaying = {
  kind: "track",
  title: "Seed",
  startedAt: new Date().toISOString(),
  durationSeconds: 100,
  listeners: 5,
}

function fakeClient(): RadioClient & {
  emitNp: (np: NowPlaying | null) => void
} {
  let npCb: ((np: NowPlaying | null) => void) | null = null
  return {
    getNowPlaying: () => Promise.resolve(seedNp),
    getQueue: () => Promise.resolve([]),
    getHistory: () => Promise.resolve([]),
    subscribeNowPlaying: (onEvent) => {
      npCb = onEvent
      return () => {
        npCb = null
      }
    },
    subscribeQueue: () => () => {},
    heartbeat: () => Promise.resolve(),
    emitNp: (np) => npCb?.(np),
  }
}

function StatusHarness({ client }: { client: RadioClient }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [player] = useState(() => createFakePlayer())
  const state = useRadio(ref, {
    client,
    createPlayer: () => player,
    playheadClock: () => Date.now(),
  })
  return (
    <div>
      {/* biome-ignore lint/a11y/useMediaCaption: test fixture audio element has no caption track */}
      <audio ref={ref} />
      <span data-testid="status">{state.status}</span>
    </div>
  )
}

describe("useRadio off-air signal", () => {
  it("flips status to off-air on a null now-playing event, and back on the next NowPlaying", async () => {
    const client = fakeClient()
    render(<StatusHarness client={client} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId("status").textContent).toBe("connecting")

    act(() => {
      client.emitNp(null)
    })
    expect(screen.getByTestId("status").textContent).toBe("off-air")

    act(() => {
      client.emitNp(seedNp)
    })
    expect(screen.getByTestId("status").textContent).toBe("connecting")
  })
})
