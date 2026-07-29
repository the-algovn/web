// The shape of a broadcast.
//
// One presentation clock runs from the first word of the intro to the moment the
// result lands, and these functions slice it. Three timers would give audio and
// picture something to disagree with; one timeline cannot.

import { type ScheduledLine, scheduledLineAt } from "./schedule"
import { CAPTION_HOLD_MS } from "./timeline"

export type Beat = "prerace" | "countdown" | "race" | "result"

/** The countdown. Silent by design — the caster's first race line covers the gun. */
export const COUNTDOWN_MS = 3000

export interface Timings {
  /** When the intro stops speaking. Zero when there is no intro. */
  introMs: number
  /** The race itself, from the package. */
  raceMs: number
}

/** The whole presentation, first word to result. */
export function totalMs(t: Timings): number {
  return t.introMs + COUNTDOWN_MS + t.raceMs
}

/**
 * beatAt slices the presentation clock into its beats and hands back a clock
 * that restarts at zero for each one — so the race's local time is exactly the
 * tMs every existing function already takes.
 *
 * The photo finish is deliberately not a beat. It is a camera move over the last
 * stretch of the race, and modelling it as a fifth state would mean two states
 * that draw the same thing and a transition that can be got wrong.
 */
export function beatAt(elapsedMs: number, t: Timings): { beat: Beat; localMs: number } {
  if (elapsedMs < t.introMs) return { beat: "prerace", localMs: elapsedMs }

  const afterIntro = elapsedMs - t.introMs
  if (afterIntro < COUNTDOWN_MS) return { beat: "countdown", localMs: afterIntro }

  const raceMs = afterIntro - COUNTDOWN_MS
  if (raceMs < t.raceMs) return { beat: "race", localMs: raceMs }

  return { beat: "result", localMs: raceMs - t.raceMs }
}

/**
 * captionAt picks the line on the rail.
 *
 * The rail follows the beat, not the clock. Pre-race and countdown belong to the
 * intro track; the countdown reads past the intro's end so the last line lingers
 * and then falls silent on its own. The result holds the finish call, which is
 * the one line whose timing carries meaning.
 *
 * Both halves of that are load-bearing. Reading the race track on the countdown
 * would announce the opening call before the gun and give the start away; reading
 * it at the result beat's own clock — which restarts at zero, and then freezes
 * there when the race clock stops — would snap the rail back to the first line of
 * the race at the exact moment the winner lands.
 */
export function captionAt(
  beat: Beat,
  localMs: number,
  durationMs: number,
  intro: { lines: ScheduledLine[]; endMs: number },
  race: { lines: ScheduledLine[] },
): ScheduledLine | null {
  switch (beat) {
    case "prerace":
      return scheduledLineAt(intro.lines, localMs, CAPTION_HOLD_MS)
    case "countdown":
      return scheduledLineAt(intro.lines, intro.endMs + localMs, CAPTION_HOLD_MS)
    case "race":
      return scheduledLineAt(race.lines, localMs, CAPTION_HOLD_MS)
    case "result":
      // The race's full length, not the result beat's local clock: the finish
      // call is pinned there and stays visible for as long as the panel is up.
      return scheduledLineAt(race.lines, durationMs, CAPTION_HOLD_MS)
  }
}

/** Four beats of countdown across COUNTDOWN_MS, the last landing on the gun. */
export function countdownLabel(localMs: number): string {
  const step = COUNTDOWN_MS / 4
  const i = Math.min(3, Math.floor(Math.max(0, localMs) / step))
  return ["3", "2", "1", "THẢ VỊT!"][i] ?? "THẢ VỊT!"
}

/** How long the frame tightens for at the end of a photo finish. */
export const PHOTO_FINISH_MS = 1500
/** How far it tightens. Horizontal only — see cameraScaleAt. */
export const PHOTO_FINISH_SCALE = 1.6

/**
 * cameraScaleAt is the horizontal zoom toward the finish line.
 *
 * Horizontal only, and around the finish-line x: scaling both axes would crop
 * lanes out of frame at twelve ducks, while scaling x expands the gap that
 * matters and leaves every lane visible.
 *
 * It arms off the package's drama, which was decided when the race was authored.
 * A frame that tightens on a race decided in the first five seconds reads as a
 * bug rather than as drama.
 */
export function cameraScaleAt(drama: string, tMs: number, durationMs: number): number {
  if (drama !== "photo_finish" || durationMs <= 0) return 1
  const remaining = durationMs - tMs
  if (remaining > PHOTO_FINISH_MS) return 1
  const progress = Math.min(1, Math.max(0, 1 - remaining / PHOTO_FINISH_MS))
  return 1 + (PHOTO_FINISH_SCALE - 1) * progress
}
