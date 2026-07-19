import { describe, expect, it } from "vitest"
import { createNowPlayingSync } from "../nowplaying-sync"
import type { NowPlaying } from "../radio-client"

const at = (title: string, startedAt: string): NowPlaying => ({
  kind: "track", title, startedAt, durationSeconds: 100, listeners: 5,
})
const ms = (s: string) => new Date(s).getTime()

describe("createNowPlayingSync", () => {
  it("holds the current item until the playhead reaches the next one's start", () => {
    const s = createNowPlayingSync(at("A", "2026-07-20T16:00:00Z"))
    s.ingest(at("B", "2026-07-20T16:04:00Z")) // server says B, but we haven't heard it yet
    expect(s.current(ms("2026-07-20T16:03:59Z"))?.title).toBe("A")
    expect(s.current(ms("2026-07-20T16:04:00Z"))?.title).toBe("B")
  })
  it("ignores an event that is behind the current pick", () => {
    const s = createNowPlayingSync(at("A", "2026-07-20T16:00:00Z"))
    s.ingest(at("stale", "2026-07-20T15:59:00Z"))
    expect(s.current(ms("2026-07-20T16:01:00Z"))?.title).toBe("A")
  })
})
