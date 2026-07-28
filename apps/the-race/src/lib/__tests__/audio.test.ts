import { describe, expect, it, vi } from "vitest"
import { type AudioEngine, play, preload } from "../audio"
import type { ScheduledLine } from "../schedule"
import type { Line } from "../types"

const line = (atMs: number, text: string, audioUrl = "", intensity = 3): Line => ({
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

describe("preload", () => {
  it("decodes every clip and schedules from the measured lengths", async () => {
    const lines = [
      line(0, "a", "a.mp3"),
      line(5000, "b", "b.mp3"),
      line(10000, "f", "f.mp3", 5),
    ]
    const out = await preload(engineFor({ "a.mp3": 2, "b.mp3": 2, "f.mp3": 2 }), lines, fetcher)

    expect(out.voiced).toBe(3)
    expect(out.dropped).toEqual([])
    expect(out.lines.map((l) => l.durationMs)).toEqual([2000, 2000, 2000])
  })

  // One bad clip costs one line, never the race.
  it("absorbs a clip that will not decode", async () => {
    const lines = [line(0, "a", "a.mp3"), line(5000, "b", "broken.mp3"), line(10000, "f", "f.mp3", 5)]
    const out = await preload(engineFor({ "a.mp3": 2, "f.mp3": 2 }), lines, fetcher)

    expect(out.voiced).toBe(2)
    expect(out.buffers[1]).toBeNull()
    // The unvoiced line still appears, with no duration.
    expect(out.lines.find((l) => l.text === "b")?.durationMs).toBe(0)
  })

  it("absorbs a clip that will not fetch", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("HTTP 404"))
    const lines = [line(0, "a", "a.mp3"), line(9000, "f", "", 5)]
    const out = await preload(engineFor({}), lines, failing)

    expect(out.voiced).toBe(0)
    expect(out.lines).toHaveLength(2)
  })

  it("does not fetch anything for a line with no clip", async () => {
    const fetchSpy = vi.fn(fetcher)
    const lines = [line(0, "silent"), line(9000, "f", "", 5)]
    await preload(engineFor({}), lines, fetchSpy)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("reports a fully silent race rather than failing", async () => {
    const lines = [line(0, "a"), line(5000, "b"), line(9000, "f", "", 5)]
    const out = await preload(engineFor({}), lines, fetcher)

    expect(out.voiced).toBe(0)
    expect(out.lines).toHaveLength(3)
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
    ...line(startMs, `line-${index}`),
    index,
    startMs,
    durationMs: 1000,
    nudged: false,
  })

  it("schedules each clip against the audio clock, not wall time", () => {
    const { ctx, started } = fakeContext()
    const buffers = [{ duration: 1 }, { duration: 1 }] as AudioBuffer[]
    const playback = play(ctx, [scheduled(0, 0), scheduled(1, 5000)], buffers, {} as AudioNode)

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
    play(ctx, [scheduled(0, 0), scheduled(2, 5000)], buffers, {} as AudioNode)

    expect(started.map((s) => s.buffer)).toEqual([first, third])
  })

  it("skips lines with no audio", () => {
    const { ctx, started } = fakeContext()
    const buffers = [null, { duration: 1 }] as (AudioBuffer | null)[]
    play(ctx, [scheduled(0, 0), scheduled(1, 3000)], buffers, {} as AudioNode)

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

    const playback = play(ctx, [scheduled(0, 0)], [{ duration: 1 } as AudioBuffer], {} as AudioNode)
    expect(() => playback.stop()).not.toThrow()
  })
})
