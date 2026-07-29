// The commentary tracks: the intro, spoken over the starting gate, and the race
// itself.
//
// Both are decoded before the race starts, then scheduled against the
// AudioContext clock — the same clock the ducks are drawn from. One timebase is
// the whole reason audio and picture cannot drift: there is no second clock to
// disagree with.
//
// A clip that will not load is not an error. It becomes a silent line, and the
// caption carries it.

import type { Line, RacePackage } from "./types"
import { type ScheduledLine, schedule, scheduleIntro, trackEndMs } from "./schedule"

/** One commentary track, decoded and laid out on its own times. */
export interface Track {
  /** Decoded audio per line; null where the line has no usable clip. */
  buffers: (AudioBuffer | null)[]
  /** The finalized, collision-free schedule. */
  lines: ScheduledLine[]
  /** Lines that could not be fitted and will not be spoken. */
  dropped: Line[]
  /** How many lines actually have audio — 0 means a silent track. */
  voiced: number
  /** When the track stops speaking. The intro's beat ends here. */
  endMs: number
}

export interface Preloaded {
  intro: Track
  race: Track
}

/** Minimal surface we need, so tests can supply a stand-in. */
export interface AudioEngine {
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>
  readonly currentTime: number
}

export type Fetcher = (url: string) => Promise<ArrayBuffer>

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`clip fetch failed: HTTP ${res.status}`)
  return res.arrayBuffer()
}

async function decode(
  engine: AudioEngine,
  lines: Line[],
  fetcher: Fetcher,
): Promise<(AudioBuffer | null)[]> {
  return Promise.all(
    lines.map(async (line) => {
      if (!line.audioUrl) return null
      try {
        return await engine.decodeAudioData(await fetcher(line.audioUrl))
      } catch {
        // A line we cannot speak is a line we can still show.
        return null
      }
    }),
  )
}

/**
 * preload fetches and decodes both commentary tracks, then finalizes each
 * schedule from the durations it measured. This runs while the preparing screen
 * is up, so nothing waits on the network once the broadcast has started.
 *
 * The tracks are laid out by different rules — the race pins its finish call and
 * drops what will not fit, the intro runs end to end and drops nothing — and
 * they keep separate buffer arrays because both index their lines from zero.
 */
export async function preload(
  engine: AudioEngine,
  race: RacePackage,
  fetcher: Fetcher = defaultFetcher,
): Promise<Preloaded> {
  const [introBuffers, raceBuffers] = await Promise.all([
    decode(engine, race.introLines, fetcher),
    decode(engine, race.lines, fetcher),
  ])

  const lengthOf = (buffers: (AudioBuffer | null)[]) => (_line: Line, i: number) => {
    const buffer = buffers[i]
    return buffer ? Math.round(buffer.duration * 1000) : 0
  }

  const intro = scheduleIntro(race.introLines, lengthOf(introBuffers))
  const raceTrack = schedule(race.lines, lengthOf(raceBuffers))

  return {
    intro: {
      buffers: introBuffers,
      lines: intro.lines,
      dropped: intro.dropped,
      voiced: introBuffers.filter(Boolean).length,
      endMs: trackEndMs(intro.lines),
    },
    race: {
      buffers: raceBuffers,
      lines: raceTrack.lines,
      dropped: raceTrack.dropped,
      voiced: raceBuffers.filter(Boolean).length,
      endMs: trackEndMs(raceTrack.lines),
    },
  }
}

export interface Playback {
  /** Seconds on the AudioContext clock when the race began. */
  readonly startedAt: number
  stop(): void
}

/**
 * play schedules every clip of both tracks against the audio clock in one go, so
 * the browser owns the timing rather than a chain of setTimeouts that drift
 * under load.
 *
 * `raceOffsetMs` is where the gun is on the presentation timeline: the intro
 * plays at its own times, the race track that much later. One origin for both is
 * what stops the broadcast disagreeing with itself.
 *
 * Returns that origin: the visuals read elapsed time as
 * `ctx.currentTime - startedAt`.
 */
export function play(
  ctx: AudioContext,
  ready: Preloaded,
  raceOffsetMs: number,
  destination: AudioNode,
): Playback {
  const startedAt = ctx.currentTime
  const sources: AudioBufferSourceNode[] = []

  // Named scheduleTrack, not schedule: this module imports a function called
  // schedule, and shadowing it inside the one place both are in scope is how you
  // get a very confusing bug later.
  const scheduleTrack = (track: Track, offsetMs: number) => {
    track.lines.forEach((line) => {
      const buffer = track.buffers[line.index]
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(destination)
      source.start(startedAt + (offsetMs + line.startMs) / 1000)
      sources.push(source)
    })
  }

  scheduleTrack(ready.intro, 0)
  scheduleTrack(ready.race, raceOffsetMs)

  return {
    startedAt,
    stop() {
      for (const source of sources) {
        try {
          source.stop()
        } catch {
          // Already finished — stopping a stopped source throws, harmlessly.
        }
      }
    },
  }
}
