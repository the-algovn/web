import { describe, expect, it, vi } from "vitest"
import { type AudioEngine, type Preloaded, type Track, play, preload } from "../audio"
import type { ScheduledLine } from "../schedule"
import type { Line, RacePackage } from "../types"

const lineAt = (atMs: number, text: string, audioUrl = "", intensity = 3): Line => ({
  atMs,
  text,
  intensity,
  audioUrl,
})

/** A decoder that maps a URL to a clip length, and throws for unknown URLs. */
function engineFor(seconds: Record<string, number>): AudioEngine {
  return {
    currentTime: 0,
    async decodeAudioData(data: ArrayBuffer) {
      const url = new TextDecoder().decode(data)
      const duration = seconds[url]
      if (duration === undefined) throw new Error("undecodable")
      return { duration } as AudioBuffer
    },
  }
}

const fetcher = async (url: string) => new TextEncoder().encode(url).buffer as ArrayBuffer

const line = (text: string, clip: string, atMs = 0): Line => ({
  atMs,
  text,
  intensity: 3,
  audioUrl: clip ? `https://clips.test/${clip}.mp3` : "",
})

const raceWith = (over: Partial<RacePackage>): RacePackage => ({
  raceId: "r",
  roomId: "m",
  duckNames: ["A", "B"],
  durationMs: 8000,
  ticks: [],
  events: [],
  finishOrder: [0, 1],
  lines: [line("Xuất phát!", "r0"), line("VỀ ĐÍCH!", "r1", 8000)],
  introLines: [],
  drama: "chaos",
  fairness: { seedCommit: "", serverSeed: "", clientNonce: "", seed: "" },
  ...over,
})

function fakeCtx() {
  const started: number[] = []
  return {
    currentTime: 100,
    destination: {} as AudioNode,
    started,
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start(at: number) {
          started.push(at)
        },
        stop() {},
      }
    },
  } as unknown as AudioContext & { started: number[]; destination: AudioNode }
}

// Every clip the tests below reference ("i0", "i1", "r0", "r1") decodes to a
// fixed length here — none of those tests assert on exact durations, only on
// which track a clip landed in and when it was scheduled.
const engine = engineFor({
  "https://clips.test/i0.mp3": 1,
  "https://clips.test/i1.mp3": 1,
  "https://clips.test/r0.mp3": 1,
  "https://clips.test/r1.mp3": 1,
})

describe("preload", () => {
  it("decodes every clip and schedules from the measured lengths", async () => {
    const lines = [
      lineAt(0, "a", "a.mp3"),
      lineAt(5000, "b", "b.mp3"),
      lineAt(10000, "f", "f.mp3", 5),
    ]
    const out = await preload(engineFor({ "a.mp3": 2, "b.mp3": 2, "f.mp3": 2 }), raceWith({ lines }), fetcher)

    expect(out.race.voiced).toBe(3)
    expect(out.race.dropped).toEqual([])
    expect(out.race.lines.map((l) => l.durationMs)).toEqual([2000, 2000, 2000])
  })

  // One bad clip costs one line, never the race.
  it("absorbs a clip that will not decode", async () => {
    const lines = [lineAt(0, "a", "a.mp3"), lineAt(5000, "b", "broken.mp3"), lineAt(10000, "f", "f.mp3", 5)]
    const out = await preload(engineFor({ "a.mp3": 2, "f.mp3": 2 }), raceWith({ lines }), fetcher)

    expect(out.race.voiced).toBe(2)
    expect(out.race.buffers[1]).toBeNull()
    // The unvoiced line still appears, with no duration.
    expect(out.race.lines.find((l) => l.text === "b")?.durationMs).toBe(0)
  })

  it("absorbs a clip that will not fetch", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("HTTP 404"))
    const lines = [lineAt(0, "a", "a.mp3"), lineAt(9000, "f", "", 5)]
    const out = await preload(engineFor({}), raceWith({ lines }), failing)

    expect(out.race.voiced).toBe(0)
    expect(out.race.lines).toHaveLength(2)
  })

  it("does not fetch anything for a line with no clip", async () => {
    const fetchSpy = vi.fn(fetcher)
    const lines = [lineAt(0, "silent"), lineAt(9000, "f", "", 5)]
    await preload(engineFor({}), raceWith({ lines }), fetchSpy)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("reports a fully silent race rather than failing", async () => {
    const lines = [lineAt(0, "a"), lineAt(5000, "b"), lineAt(9000, "f", "", 5)]
    const out = await preload(engineFor({}), raceWith({ lines }), fetcher)

    expect(out.race.voiced).toBe(0)
    expect(out.race.lines).toHaveLength(3)
  })
})

describe("preload with two tracks", () => {
  it("decodes and schedules each track separately", async () => {
    const ready = await preload(engine, raceWith({
      introLines: [line("Chào!", "i0"), line("Vào vạch!", "i1")],
      lines: [line("Xuất phát!", "r0"), line("VỀ ĐÍCH!", "r1", 8000)],
    }), fetcher)

    expect(ready.intro.lines).toHaveLength(2)
    expect(ready.race.lines).toHaveLength(2)
    expect(ready.intro.voiced).toBe(2)
    expect(ready.intro.endMs).toBeGreaterThan(0)
  })

  it("survives a race with no intro at all", async () => {
    const ready = await preload(engine, raceWith({ introLines: [] }), fetcher)
    expect(ready.intro.lines).toEqual([])
    expect(ready.intro.endMs).toBe(0)
    expect(ready.race.lines.length).toBeGreaterThan(0)
  })

  it("keeps a track's buffers indexed by its own source positions", async () => {
    // Both tracks index from 0. Sharing one buffer array would make intro line 0
    // and race line 0 fight over the same slot.
    const ready = await preload(engine, raceWith({
      introLines: [line("Chào!", "i0")],
      lines: [line("Xuất phát!", "r0"), line("VỀ ĐÍCH!", "r1", 8000)],
    }), fetcher)
    expect(ready.intro.buffers).toHaveLength(1)
    expect(ready.race.buffers).toHaveLength(2)
  })
})

describe("play", () => {
  function fakeContext() {
    const started: { buffer: AudioBuffer; at: number }[] = []
    const ctx = {
      currentTime: 100,
      createBufferSource() {
        const source = {
          buffer: null as AudioBuffer | null,
          connect() {},
          start(at: number) {
            if (source.buffer) started.push({ buffer: source.buffer, at })
          },
          stop() {},
        }
        return source as unknown as AudioBufferSourceNode
      },
    } as unknown as AudioContext
    return { ctx, started }
  }

  const scheduled = (index: number, startMs: number): ScheduledLine => ({
    ...lineAt(startMs, `line-${index}`),
    index,
    startMs,
    durationMs: 1000,
    nudged: false,
  })

  // No intro in play: only the race track is scheduled, at offset 0.
  const emptyIntro: Track = { buffers: [], lines: [], dropped: [], voiced: 0, endMs: 0 }

  it("schedules each clip against the audio clock, not wall time", () => {
    const { ctx, started } = fakeContext()
    const buffers = [{ duration: 1 }, { duration: 1 }] as AudioBuffer[]
    const ready: Preloaded = {
      intro: emptyIntro,
      race: { buffers, lines: [scheduled(0, 0), scheduled(1, 5000)], dropped: [], voiced: 2, endMs: 0 },
    }
    const playback = play(ctx, ready, 0, {} as AudioNode)

    expect(playback.startedAt).toBe(100)
    expect(started.map((s) => s.at)).toEqual([100, 105])
  })

  // The bug this guards: scheduling sorts and drops lines, so a scheduled
  // line's position is not its clip's position. Looking audio up by the
  // scheduled index plays the wrong sentence.
  it("matches audio by source index, not scheduled position", () => {
    const { ctx, started } = fakeContext()
    const first = { duration: 1 } as AudioBuffer
    const third = { duration: 1 } as AudioBuffer
    const buffers = [first, null, third]

    // Line 1 was dropped, so index 2 now sits at scheduled position 1.
    const ready: Preloaded = {
      intro: emptyIntro,
      race: { buffers, lines: [scheduled(0, 0), scheduled(2, 5000)], dropped: [], voiced: 2, endMs: 0 },
    }
    play(ctx, ready, 0, {} as AudioNode)

    expect(started.map((s) => s.buffer)).toEqual([first, third])
  })

  it("skips lines with no audio", () => {
    const { ctx, started } = fakeContext()
    const buffers = [null, { duration: 1 }] as (AudioBuffer | null)[]
    const ready: Preloaded = {
      intro: emptyIntro,
      race: { buffers, lines: [scheduled(0, 0), scheduled(1, 3000)], dropped: [], voiced: 1, endMs: 0 },
    }
    play(ctx, ready, 0, {} as AudioNode)

    expect(started).toHaveLength(1)
  })

  it("stops without throwing when a source has already finished", () => {
    const ctx = {
      currentTime: 0,
      createBufferSource: () =>
        ({
          buffer: null,
          connect() {},
          start() {},
          stop() {
            throw new Error("already stopped")
          },
        }) as unknown as AudioBufferSourceNode,
    } as unknown as AudioContext

    const ready: Preloaded = {
      intro: emptyIntro,
      race: { buffers: [{ duration: 1 } as AudioBuffer], lines: [scheduled(0, 0)], dropped: [], voiced: 1, endMs: 0 },
    }
    const playback = play(ctx, ready, 0, {} as AudioNode)
    expect(() => playback.stop()).not.toThrow()
  })

  it("starts the race track after the intro and the countdown", async () => {
    const ready = await preload(engine, raceWith({
      introLines: [line("Chào!", "i0")],
      lines: [line("Xuất phát!", "r0"), line("VỀ ĐÍCH!", "r1", 8000)],
    }), fetcher)

    const ctx = fakeCtx()
    play(ctx, ready, 10_000, ctx.destination)

    const starts = ctx.started.map((s) => Math.round((s - ctx.currentTime) * 1000))
    // intro line 0 at its own 0; race line 0 at the offset; race finish at
    // offset + 8000.
    expect(starts).toEqual([0, 10_000, 18_000])
  })

  it("schedules nothing for a line whose clip would not decode", async () => {
    const ready = await preload(engine, raceWith({
      lines: [line("Xuất phát!", ""), line("VỀ ĐÍCH!", "r1", 8000)],
    }), fetcher)
    const ctx = fakeCtx()
    play(ctx, ready, 0, ctx.destination)
    expect(ctx.started).toHaveLength(1)
  })
})
