import type { NowPlaying } from "./radio-client"

const STATION = "Tần Số 42"

interface SessionLike {
  metadata: unknown
  playbackState: string
  setActionHandler(action: string, cb: (() => void) | null): void
}

function session(): SessionLike | null {
  const ms = (navigator as Navigator & { mediaSession?: SessionLike })
    .mediaSession
  return ms ?? null
}

// Lock-screen and notification metadata. If thumbnailUrl is not CORS-reachable
// the platform drops the artwork silently and keeps title/artist.
export function setMediaMetadata(np: NowPlaying | null): void {
  const ms = session()
  if (!ms) return
  if (!np) {
    ms.metadata = null
    return
  }
  if (typeof MediaMetadata !== "function") return
  ms.metadata = new MediaMetadata({
    title: np.title,
    artist: np.artist ?? STATION,
    album: STATION,
    artwork: np.thumbnailUrl ? [{ src: np.thumbnailUrl }] : [],
  })
}

export function setMediaPlaybackState(
  state: "playing" | "paused" | "none",
): void {
  const ms = session()
  if (ms) ms.playbackState = state
}

export function setMediaHandlers(h: {
  play(): void
  pause(): void
}): () => void {
  const ms = session()
  if (!ms) return () => {}
  ms.setActionHandler("play", h.play)
  ms.setActionHandler("pause", h.pause)
  return () => {
    ms.setActionHandler("play", null)
    ms.setActionHandler("pause", null)
  }
}
