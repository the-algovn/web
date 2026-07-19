import { render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { describe, expect, it } from "vitest"
import { MockStudio } from "../mock-studio"
import { createFakePlayer } from "../player"
import { useRadio } from "../use-radio"

function Harness({ clock }: { clock: () => number }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [client] = useState(() => new MockStudio({ now: clock, random: () => 0.5 }))
  const [player] = useState(() => createFakePlayer())
  const state = useRadio(ref, { client, createPlayer: () => player, playheadClock: clock })
  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- radio stream has no captions track */}
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
    expect(Number(screen.getByTestId("listeners").textContent)).toBeGreaterThan(0)
    expect(Number(screen.getByTestId("queue").textContent)).toBeGreaterThan(0)
  })
})
