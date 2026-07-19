import { describe, expect, it } from "vitest"
import { createFakePlayer } from "../player"

describe("createFakePlayer", () => {
  it("reports state transitions to subscribers", () => {
    const p = createFakePlayer()
    const seen: string[] = []
    p.onState(s => seen.push(s))
    p.emit("connecting")
    p.emit("playing")
    expect(seen).toEqual(["connecting", "playing"])
    expect(p.getState()).toBe("playing")
  })
  it("exposes a settable program-date-time for ear-sync", () => {
    const p = createFakePlayer()
    expect(p.currentProgramDateTime()).toBeNull()
    p.setPdt(1_700_000_000_000)
    expect(p.currentProgramDateTime()).toBe(1_700_000_000_000)
  })
})
