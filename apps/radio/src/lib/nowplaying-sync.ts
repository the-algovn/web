import type { NowPlaying } from "./radio-client"

export interface NowPlayingSync {
  ingest(np: NowPlaying): void
  current(playheadMs: number): NowPlaying | null
}

export function createNowPlayingSync(seed?: NowPlaying): NowPlayingSync {
  // Sorted ascending by start time. Small — we prune everything before the pick.
  const buf: { at: number; np: NowPlaying }[] = []
  const push = (np: NowPlaying) => {
    const at = new Date(np.startedAt).getTime()
    if (Number.isNaN(at)) return
    if (buf.some((e) => e.at === at)) return
    buf.push({ at, np })
    buf.sort((a, b) => a.at - b.at)
  }
  if (seed) push(seed)

  return {
    ingest: push,
    current(playheadMs) {
      let pick: { at: number; np: NowPlaying } | null = null
      for (const e of buf) {
        if (e.at <= playheadMs) pick = e
        else break
      }
      if (pick) {
        // prune items strictly before the pick to bound memory
        while (buf[0] && buf[0].at < pick.at) buf.shift()
      }
      return pick?.np ?? null
    },
  }
}
