import type { ConnMode, NowPlaying } from "./radio-client"
import type { PlayerState } from "./player"

export type StationStatus = "connecting" | "on-air" | "music-only" | "off-air"

export function deriveStationState(i: {
  mode: ConnMode
  playerState: PlayerState
  nowPlaying: NowPlaying | null
}): StationStatus {
  if (i.mode === "offline" || i.playerState === "error") return "off-air"
  if (!i.nowPlaying) return "connecting"
  if (i.playerState === "connecting" || i.playerState === "idle") return "connecting"
  const np = i.nowPlaying
  const talking = np.kind === "dj" || np.kind === "jingle" || Boolean(np.dedication)
  return talking ? "on-air" : "music-only"
}
