import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Result } from "../result"
import type { RacePackage } from "../../lib/types"

const race: RacePackage = {
  raceId: "r1",
  roomId: "m1",
  duckNames: ["Đức", "Lan", "Minh"],
  durationMs: 2000,
  ticks: [
    { tMs: 0, positions: [0, 0, 0] },
    { tMs: 1000, positions: [0.5, 0.4, 0.2] },
    { tMs: 2000, positions: [1, 0.8, 0.5] },
  ],
  events: [],
  finishOrder: [0, 1, 2],
  lines: [],
  introLines: [],
  drama: "chaos",
  fairness: { seedCommit: "abc", serverSeed: "def", clientNonce: "n", seed: "s" },
}

const props = {
  race,
  history: null,
  onReplay: () => {},
  onRematch: () => {},
  onNewRoom: () => {},
}

describe("Result", () => {
  it("puts the winner first and largest", () => {
    render(<Result {...props} />)
    expect(screen.getByRole("heading", { name: /Đức/ })).toBeInTheDocument()
  })

  it("shows how far back everyone else finished", () => {
    render(<Result {...props} />)
    expect(screen.getByText("+0.4s")).toBeInTheDocument()
    expect(screen.getByText("+1.0s")).toBeInTheDocument()
  })

  it("gives the winner no gap to itself", () => {
    render(<Result {...props} />)
    expect(screen.queryByText("+0.0s")).not.toBeInTheDocument()
  })

  it("keeps the proof collapsed until asked for", () => {
    render(<Result {...props} />)
    const toggle = screen.getByRole("button", { name: /Kiểm chứng/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(/server_seed/)).not.toBeInTheDocument()
  })

  it("names every finisher, so the order reads without colour", () => {
    render(<Result {...props} />)
    for (const name of race.duckNames) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })
})
