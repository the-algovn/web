import { describe, expect, it } from "vitest"
import {
  COUNTDOWN_MS,
  PHOTO_FINISH_MS,
  beatAt,
  cameraScaleAt,
  captionAt,
  countdownLabel,
  stageMs,
  totalMs,
} from "../broadcast"
import type { ScheduledLine } from "../schedule"
import { CAPTION_HOLD_MS } from "../timeline"

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

describe("captionAt", () => {
  const line = (startMs: number, text: string, index: number): ScheduledLine => ({
    atMs: startMs,
    text,
    intensity: 3,
    audioUrl: "",
    index,
    startMs,
    durationMs: 0,
    nudged: false,
  })

  const intro = {
    lines: [line(0, "Chào mừng!", 0), line(2500, "Bốn tay đua hôm nay", 1)],
    endMs: 5000,
  }
  const race = {
    lines: [line(0, "Xuất phát!", 0), line(24_000, "Đức thắng!", 1)],
  }

  it("reads the intro track before the gun", () => {
    expect(captionAt("prerace", 0, intro, race)?.text).toBe("Chào mừng!")
    expect(captionAt("prerace", 3000, intro, race)?.text).toBe(
      "Bốn tay đua hôm nay",
    )
  })

  it("never announces the opening race call before the gun", () => {
    // The countdown reading the race track would give the start away — it is
    // still the intro's track, read past the intro's end.
    expect(captionAt("countdown", 0, intro, race)?.text).toBe(
      "Bốn tay đua hôm nay",
    )
    for (let localMs = 0; localMs < COUNTDOWN_MS; localMs += 100) {
      expect(captionAt("countdown", localMs, intro, race)?.text).not.toBe("Xuất phát!")
    }
  })

  it("lets the last intro line linger and then fall silent on its own", () => {
    // Held from its own start, not re-timed by the countdown: 2500ms in at the
    // gun, silent once CAPTION_HOLD_MS is up.
    expect(captionAt("countdown", 1000, intro, race)?.text).toBe(
      "Bốn tay đua hôm nay",
    )
    expect(captionAt("countdown", 2999, intro, race)).toBeNull()
  })

  it("runs the race track on the race's own clock", () => {
    expect(captionAt("race", 0, intro, race)?.text).toBe("Xuất phát!")
    expect(captionAt("race", 24_000, intro, race)?.text).toBe("Đức thắng!")
  })

  it("holds the finish call at the result instead of snapping back to the start", () => {
    // The result beat's own clock restarts at zero and then freezes there, so
    // reading the race track at localMs would show the opening call under the
    // winner's panel for as long as it is up.
    expect(captionAt("result", 0, intro, race)?.text).toBe("Đức thắng!")
    expect(captionAt("result", 0, intro, race)?.text).not.toBe("Xuất phát!")
  })

  it("keeps holding it however long the panel stays up", () => {
    const held = captionAt("result", 0, intro, race)
    for (const localMs of [0, 1000, 30_000, 600_000]) {
      expect(captionAt("result", localMs, intro, race)).toEqual(held)
    }
  })

  it("holds a finish call however far before the end it was called", () => {
    // The hold must not depend on a clock at all. This call lands 5s before the
    // race ends — comfortably past CAPTION_HOLD_MS — so a lookup at the race's
    // full length would return nothing and leave the rail empty under the panel.
    const early = { lines: [line(0, "Xuất phát!", 0), line(19_000, "Đức thắng!", 1)] }
    expect(24_000 - 19_000).toBeGreaterThan(CAPTION_HOLD_MS)
    expect(captionAt("result", 0, intro, early)?.text).toBe("Đức thắng!")
  })

  it("is silent rather than throwing on a race with no commentary at all", () => {
    const empty = { lines: [], endMs: 0 }
    expect(captionAt("prerace", 0, empty, empty)).toBeNull()
    expect(captionAt("countdown", 0, empty, empty)).toBeNull()
    expect(captionAt("race", 0, empty, empty)).toBeNull()
    expect(captionAt("result", 0, empty, empty)).toBeNull()
  })
})

describe("stageMs", () => {
  it("holds the ducks at the gate through both pre-gun beats", () => {
    // A stage that read the presentation clock before the gun would show the
    // field already strung out down the course while the caster is introducing
    // them.
    expect(stageMs("prerace", 0, 24_000)).toBe(0)
    expect(stageMs("prerace", 7999, 24_000)).toBe(0)
    expect(stageMs("countdown", 0, 24_000)).toBe(0)
    expect(stageMs("countdown", 2999, 24_000)).toBe(0)
  })

  it("runs on the race's own clock once the gun goes", () => {
    expect(stageMs("race", 0, 24_000)).toBe(0)
    expect(stageMs("race", 12_345, 24_000)).toBe(12_345)
  })

  it("holds the final frame at the result rather than rewinding", () => {
    // The result beat's clock restarts at zero: following it would put the ducks
    // back on the start line under the winner's panel.
    for (const localMs of [0, 1000, 600_000]) {
      expect(stageMs("result", localMs, 24_000)).toBe(24_000)
    }
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
