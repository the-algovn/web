import { describe, expect, it } from "vitest"
import {
  COUNTDOWN_MS,
  PHOTO_FINISH_MS,
  beatAt,
  cameraScaleAt,
  countdownLabel,
  totalMs,
} from "../broadcast"

const timings = { introMs: 8000, raceMs: 24_000 }

describe("beatAt", () => {
  it("runs pre-race, countdown, race, result in order", () => {
    expect(beatAt(0, timings).beat).toBe("prerace")
    expect(beatAt(7999, timings).beat).toBe("prerace")
    expect(beatAt(8000, timings).beat).toBe("countdown")
    expect(beatAt(10_999, timings).beat).toBe("countdown")
    expect(beatAt(11_000, timings).beat).toBe("race")
    expect(beatAt(34_999, timings).beat).toBe("race")
    expect(beatAt(35_000, timings).beat).toBe("result")
  })

  it("restarts the clock at zero for each beat", () => {
    expect(beatAt(3000, timings).localMs).toBe(3000)
    expect(beatAt(9500, timings).localMs).toBe(1500)
    // The race's local clock IS the tMs every existing function already takes.
    expect(beatAt(11_500, timings).localMs).toBe(500)
  })

  it("still passes through all four beats when the broadcast is silent", () => {
    // No TTS does NOT mean introMs is zero: scheduleIntro falls back to 2500ms a
    // line, so three lines still occupy 7500ms. A silent race must reach every
    // beat, because neither the countdown nor the race depends on audio.
    const silent = { introMs: 7500, raceMs: 24_000 }
    expect(beatAt(0, silent).beat).toBe("prerace")
    expect(beatAt(7500, silent).beat).toBe("countdown")
    expect(beatAt(7500 + COUNTDOWN_MS, silent).beat).toBe("race")
    expect(beatAt(7500 + COUNTDOWN_MS + 24_000, silent).beat).toBe("result")
  })

  it("skips straight to the countdown when there is no intro at all", () => {
    // A package with an empty intro_lines array — the countdown must still show.
    const none = { introMs: 0, raceMs: 1000 }
    expect(beatAt(0, none).beat).toBe("countdown")
    expect(beatAt(COUNTDOWN_MS, none).beat).toBe("race")
  })
})

describe("totalMs", () => {
  it("is the whole presentation, gun to result", () => {
    expect(totalMs(timings)).toBe(8000 + COUNTDOWN_MS + 24_000)
  })
})

describe("countdownLabel", () => {
  it("counts three, two, one and then calls the start", () => {
    expect(countdownLabel(0)).toBe("3")
    expect(countdownLabel(800)).toBe("2")
    expect(countdownLabel(1600)).toBe("1")
    expect(countdownLabel(2400)).toBe("THẢ VỊT!")
  })

  it("holds the call rather than going blank at the gun", () => {
    expect(countdownLabel(COUNTDOWN_MS)).toBe("THẢ VỊT!")
  })
})

describe("cameraScaleAt", () => {
  it("is identity outside the last stretch", () => {
    expect(cameraScaleAt("photo_finish", 0, 24_000)).toBe(1)
    expect(cameraScaleAt("photo_finish", 24_000 - PHOTO_FINISH_MS - 1, 24_000)).toBe(1)
  })

  it("tightens toward the line", () => {
    const mid = cameraScaleAt("photo_finish", 24_000 - PHOTO_FINISH_MS / 2, 24_000)
    const end = cameraScaleAt("photo_finish", 24_000, 24_000)
    expect(mid).toBeGreaterThan(1)
    expect(end).toBeGreaterThan(mid)
  })

  it("is never applied when the package did not call a photo finish", () => {
    // Arming off the drama is the whole point: a tightening frame on a race
    // that was decided early reads as a bug, not as drama.
    expect(cameraScaleAt("wire_to_wire", 24_000, 24_000)).toBe(1)
    expect(cameraScaleAt("late_surge", 24_000, 24_000)).toBe(1)
    expect(cameraScaleAt("chaos", 24_000, 24_000)).toBe(1)
    expect(cameraScaleAt("", 24_000, 24_000)).toBe(1)
  })

  it("is identity for a race with no duration rather than dividing by zero", () => {
    expect(cameraScaleAt("photo_finish", 0, 0)).toBe(1)
  })
})
