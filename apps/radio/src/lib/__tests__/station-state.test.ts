import { describe, expect, it } from "vitest"
import type { NowPlaying } from "../radio-client"
import { deriveStationState } from "../station-state"

const np = (over: Partial<NowPlaying> = {}): NowPlaying => ({
  kind: "track",
  title: "T",
  startedAt: "2026-07-20T16:00:00Z",
  durationSeconds: 100,
  listeners: 4,
  ...over,
})

describe("deriveStationState", () => {
  it("is connecting before anything is playing", () => {
    expect(
      deriveStationState({
        mode: "connecting",
        playerState: "connecting",
        nowPlaying: null,
      }),
    ).toBe("connecting")
  })
  it("is off-air on offline mode or a player error", () => {
    expect(
      deriveStationState({
        mode: "offline",
        playerState: "playing",
        nowPlaying: np(),
      }),
    ).toBe("off-air")
    expect(
      deriveStationState({
        mode: "live",
        playerState: "error",
        nowPlaying: np(),
      }),
    ).toBe("off-air")
  })
  it("is music-only for a dedication-less track", () => {
    expect(
      deriveStationState({
        mode: "live",
        playerState: "playing",
        nowPlaying: np(),
      }),
    ).toBe("music-only")
  })
  it("is on-air for a DJ slot or a dedicated track", () => {
    expect(
      deriveStationState({
        mode: "live",
        playerState: "playing",
        nowPlaying: np({ kind: "dj" }),
      }),
    ).toBe("on-air")
    expect(
      deriveStationState({
        mode: "live",
        playerState: "playing",
        nowPlaying: np({ dedication: "hi" }),
      }),
    ).toBe("on-air")
  })
})
