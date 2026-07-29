import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Stage } from "../stage"
import type { RacePackage } from "../../lib/types"

// The painter itself is deliberately untested — jsdom has no 2D context. What is
// tested here is everything the canvas is NOT: the standings a screen reader is
// given, and the rank numbers beside the names.
const race: RacePackage = {
  raceId: "r1",
  roomId: "m1",
  duckNames: ["Đức", "Lan", "Minh"],
  durationMs: 2000,
  ticks: [
    { tMs: 0, positions: [0, 0, 0] },
    { tMs: 2000, positions: [0.5, 0.9, 0.2] },
  ],
  events: [],
  finishOrder: [1, 0, 2],
  lines: [],
  introLines: [],
  drama: "chaos",
  fairness: { seedCommit: "abc", serverSeed: "def", clientNonce: "n", seed: "s" },
}

/** The lane labels, in lane order: what each rank glyph reads beside its name. */
const laneLabels = () =>
  screen.getAllByRole("listitem").map((li) => li.textContent)

describe("Stage", () => {
  it("announces no standings before the gun, matching the ranks it shows", () => {
    // Two clocks: the presentation is 4.2s in (the caster is talking) while the
    // race clock is still pinned at zero, because nobody has moved.
    render(<Stage race={race} tMs={0} elapsedMs={4200} reducedMotion={false} atGate />)

    expect(
      screen.getByRole("img", { name: "Các vịt đang chờ ở vạch xuất phát" }),
    ).toBeInTheDocument()
    // The lane labels say the same thing: nothing has a rank yet.
    expect(laneLabels()).toEqual(["–Đức", "–Lan", "–Minh"])
  })

  it("announces the running order once the race is on", () => {
    render(<Stage race={race} tMs={2000} elapsedMs={13_000} reducedMotion={false} />)

    expect(
      screen.getByRole("img", { name: "Thứ tự hiện tại: 1. Lan, 2. Đức, 3. Minh" }),
    ).toBeInTheDocument()
  })

  it("numbers the lanes by position, not by lane order", () => {
    // Lan leads from lane two. Rendering `duck + 1` would read 1, 2, 3 down the
    // lanes and look perfectly plausible while being the wrong race.
    render(<Stage race={race} tMs={2000} elapsedMs={13_000} reducedMotion={false} />)

    expect(laneLabels()).toEqual(["2Đức", "1Lan", "3Minh"])
  })
})
