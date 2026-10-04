import type Hls from "hls.js"
import { describe, expect, it } from "vitest"
import { createFakePlayer, createHlsPlayer } from "../player"

describe("createFakePlayer", () => {
  it("reports state transitions to subscribers", () => {
    const p = createFakePlayer()
    const seen: string[] = []
    p.onState((s) => seen.push(s))
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

const STREAM = "https://example.test/live.m3u8"

function fakeHls(supported: boolean) {
  const created: FakeHls[] = []
  class FakeHls {
    static Events = { ERROR: "hlsError" }
    static isSupported = () => supported
    playingDate: Date | null = null
    source: string | null = null
    constructor() {
      created.push(this)
    }
    on() {}
    loadSource(url: string) {
      this.source = url
    }
    attachMedia() {}
    destroy() {}
  }
  return { Ctor: FakeHls as unknown as typeof Hls, created }
}

// Chromium: plays HLS natively but has no getStartDate, so no PDT.
function chromiumAudio() {
  const audio = document.createElement("audio")
  audio.canPlayType = () => "maybe"
  audio.play = async () => {}
  return audio
}

// Safari/iOS: native HLS with the timeline start date.
function safariAudio(startDate = new Date(Number.NaN)) {
  const audio = chromiumAudio()
  Object.assign(audio, { getStartDate: () => startDate })
  return audio
}

const neverLoadHls = async (): Promise<typeof Hls> => {
  throw new Error("hls.js must not load")
}

describe("createHlsPlayer", () => {
  it("uses hls.js when native playback cannot report a program-date-time", async () => {
    const audio = chromiumAudio()
    const hls = fakeHls(true)
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: async () => hls.Ctor,
    })
    await p.play()
    expect(hls.created).toHaveLength(1)
    expect(hls.created[0]?.source).toBe(STREAM)
    expect(audio.getAttribute("src")).toBeNull()
  })

  it("plays natively without loading hls.js when native reports a start date", async () => {
    const audio = safariAudio()
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: neverLoadHls,
    })
    await p.play()
    expect(audio.src).toBe(STREAM)
  })

  it("falls back to native playback when hls.js is unsupported", async () => {
    const audio = chromiumAudio()
    const hls = fakeHls(false)
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: async () => hls.Ctor,
    })
    await p.play()
    expect(hls.created).toHaveLength(0)
    expect(audio.src).toBe(STREAM)
  })

  it("reads the audible program-date-time from hls.js", async () => {
    const audio = chromiumAudio()
    const hls = fakeHls(true)
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: async () => hls.Ctor,
    })
    await p.play()
    expect(p.currentProgramDateTime()).toBeNull()
    hls.created[0]!.playingDate = new Date(1_700_000_000_000)
    expect(p.currentProgramDateTime()).toBe(1_700_000_000_000)
  })

  it("maps native playback position onto the stream start date", async () => {
    const audio = safariAudio(new Date(1_700_000_000_000))
    Object.defineProperty(audio, "currentTime", { value: 12.5 })
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: neverLoadHls,
    })
    await p.play()
    expect(p.currentProgramDateTime()).toBe(1_700_000_012_500)
  })

  it("reports no program-date-time while the native start date is unknown", async () => {
    const audio = safariAudio()
    const p = createHlsPlayer(audio, {
      streamUrl: STREAM,
      loadHls: neverLoadHls,
    })
    await p.play()
    expect(p.currentProgramDateTime()).toBeNull()
  })
})
