// The commentary track.
//
// Everything is decoded before the race starts, then scheduled against the
// AudioContext clock — the same clock the ducks are drawn from. One timebase is
// the whole reason audio and picture cannot drift: there is no second clock to
// disagree with.
//
// A clip that will not load is not an error. It becomes a silent line, and the
// caption carries it.

import type { Line } from "./types"
import { type ScheduledLine, schedule } from "./schedule"

export interface Preloaded {
  /** Decoded audio per line; null where the line has no usable clip. */
  buffers: (AudioBuffer | null)[]
  /** The finalized, collision-free schedule. */
  lines: ScheduledLine[]
  /** Lines that could not be fitted and will not be spoken. */
  dropped: Line[]
  /** How many lines actually have audio — 0 means a silent race. */
  voiced: number
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

/**
 * preload fetches and decodes every clip, then finalizes the schedule from the
 * durations it measured. This runs while the preparing screen is up, so the
 * race never waits on the network once it has started.
 *
 * Clips load in parallel and failures are absorbed individually — one 404 costs
 * one line, not the race.
 */
export async function preload(
  engine: AudioEngine,
  lines: Line[],
  fetcher: Fetcher = defaultFetcher,
): Promise<Preloaded> {
  const buffers = await Promise.all(
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

  const { lines: scheduled, dropped } = schedule(lines, (_line, i) => {
    const buffer = buffers[i]
    return buffer ? Math.round(buffer.duration * 1000) : 0
  })

  return {
    buffers,
    lines: scheduled,
    dropped,
    voiced: buffers.filter(Boolean).length,
  }
}

export interface Playback {
  /** Seconds on the AudioContext clock when the race began. */
  readonly startedAt: number
  stop(): void
}

/**
 * play schedules every clip against the audio clock in one go, so the browser
 * owns the timing rather than a chain of setTimeouts that drift under load.
 *
 * Returns the clock origin: the visuals read elapsed time as
 * `ctx.currentTime - startedAt`, which is why they cannot disagree with what
 * is being spoken.
 */
export function play(
  ctx: AudioContext,
  scheduled: ScheduledLine[],
  buffers: (AudioBuffer | null)[],
  destination: AudioNode,
): Playback {
  const startedAt = ctx.currentTime
  const sources: AudioBufferSourceNode[] = []

  scheduled.forEach((line) => {
    const buffer = buffers[line.index]
    if (!buffer) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(destination)
    source.start(startedAt + line.startMs / 1000)
    sources.push(source)
  })

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
