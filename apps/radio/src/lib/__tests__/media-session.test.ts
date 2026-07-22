import { afterEach, describe, expect, it, vi } from "vitest"
import {
  setMediaHandlers,
  setMediaMetadata,
  setMediaPlaybackState,
} from "../media-session"
import type { NowPlaying } from "../radio-client"

const np: NowPlaying = {
  kind: "track",
  title: "Chúng Ta Của Tương Lai",
  artist: "Sơn Tùng M-TP",
  thumbnailUrl: "https://img.example/art.jpg",
  startedAt: "2026-07-23T10:00:00.000Z",
  durationSeconds: 200,
  listeners: 7,
}

function stubMediaSession() {
  const handlers = new Map<string, (() => void) | null>()
  const session = {
    metadata: null as unknown,
    playbackState: "none",
    setActionHandler: (action: string, cb: (() => void) | null) => {
      handlers.set(action, cb)
    },
  }
  vi.stubGlobal("navigator", { mediaSession: session })
  vi.stubGlobal(
    "MediaMetadata",
    class {
      constructor(public init: Record<string, unknown>) {}
    },
  )
  return { session, handlers }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("media-session", () => {
  it("does nothing and does not throw when the API is absent", () => {
    vi.stubGlobal("navigator", {})
    expect(() => setMediaMetadata(np)).not.toThrow()
    expect(() => setMediaPlaybackState("playing")).not.toThrow()
    expect(() => setMediaHandlers({ play: () => {}, pause: () => {} })).not.toThrow()
  })

  it("publishes title, artist and artwork", () => {
    const { session } = stubMediaSession()
    setMediaMetadata(np)
    const meta = session.metadata as { init: Record<string, unknown> }
    expect(meta.init.title).toBe("Chúng Ta Của Tương Lai")
    expect(meta.init.artist).toBe("Sơn Tùng M-TP")
    expect(meta.init.artwork).toEqual([{ src: "https://img.example/art.jpg" }])
  })

  it("omits artwork when the track has no thumbnail", () => {
    const { session } = stubMediaSession()
    setMediaMetadata({ ...np, thumbnailUrl: undefined })
    const meta = session.metadata as { init: Record<string, unknown> }
    expect(meta.init.artwork).toEqual([])
  })

  it("clears metadata for a null now-playing", () => {
    const { session } = stubMediaSession()
    setMediaMetadata(np)
    setMediaMetadata(null)
    expect(session.metadata).toBeNull()
  })

  it("wires play and pause, and unregisters on cleanup", () => {
    const { handlers } = stubMediaSession()
    const play = vi.fn()
    const pause = vi.fn()
    const dispose = setMediaHandlers({ play, pause })

    handlers.get("play")?.()
    handlers.get("pause")?.()
    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalledOnce()

    dispose()
    expect(handlers.get("play")).toBeNull()
    expect(handlers.get("pause")).toBeNull()
  })

  it("mirrors playback state", () => {
    const { session } = stubMediaSession()
    setMediaPlaybackState("playing")
    expect(session.playbackState).toBe("playing")
  })
})
