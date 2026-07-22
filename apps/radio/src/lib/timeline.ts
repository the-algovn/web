import type { HistoryItem, NowPlaying, QueueItem } from "./radio-client"
import type { TrackRequest } from "./request-client"

export type EntryZone = "pending" | "future" | "current" | "past"

export interface TimelineEntry {
  key: string
  zone: EntryZone
  title: string
  artist?: string
  thumbnailUrl?: string
  source?: "listener" | "ai"
  requestedByName?: string
  reason?: string
  hasDedication?: boolean // future — a boolean flag only, never the text
  dedication?: string // current/past — only when this session saw it on air
  airedAt?: string // past only
  status?: TrackRequest["status"] // pending only
  witnessed: boolean // did this session watch it play
}

// `future` is held nearest-first, the order the client gives us. The
// single-time-axis view reverses it so the furthest-out item renders at the
// top; keeping storage in data order means the reducer never reasons about
// presentation.
export interface TimelineState {
  pending: TimelineEntry[]
  future: TimelineEntry[]
  current: TimelineEntry | null
  past: TimelineEntry[]
}

export const EMPTY: TimelineState = {
  pending: [],
  future: [],
  current: null,
  past: [],
}

// The payload carries no IDs, so identity is composite. The separator is the
// four-character escape \u0000 — type it literally, never paste a raw NUL —
// so that "ab"+"c" cannot collide with "a"+"bc".
export function entryKey(title: string, artist?: string): string {
  return `${title}\u0000${artist ?? ""}`
}

function uniqueKey(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}#${n}`)) n += 1
  return `${base}#${n}`
}

function futureFrom(queue: QueueItem[]): TimelineEntry[] {
  const taken = new Set<string>()
  return queue.map((item) => {
    const key = uniqueKey(entryKey(item.title, item.artist), taken)
    taken.add(key)
    return {
      key,
      zone: "future" as const,
      title: item.title,
      artist: item.artist,
      thumbnailUrl: item.thumbnailUrl,
      source: item.source,
      requestedByName: item.requestedByName,
      reason: item.reason,
      hasDedication: item.hasDedication,
      witnessed: false,
    }
  })
}

export function seed(input: {
  history: HistoryItem[]
  queue: QueueItem[]
}): TimelineState {
  const taken = new Set<string>()
  const past = [...input.history]
    .sort((a, b) => Date.parse(b.airedAt) - Date.parse(a.airedAt))
    .map((item) => {
      const key = uniqueKey(entryKey(item.title, item.artist), taken)
      taken.add(key)
      return {
        key,
        zone: "past" as const,
        title: item.title,
        artist: item.artist,
        thumbnailUrl: item.thumbnailUrl,
        source: item.source,
        requestedByName: item.requestedByName,
        reason: item.reason,
        airedAt: item.airedAt,
        witnessed: false,
      }
    })
  return { pending: [], future: futureFrom(input.queue), current: null, past }
}

export function ingestQueue(
  s: TimelineState,
  queue: QueueItem[],
): TimelineState {
  return { ...s, future: futureFrom(queue) }
}

// Where accrual happens. `current` is retained precisely so the dedication
// text — which exists on no other payload — survives the move into `past`.
export function ingestNowPlaying(
  s: TimelineState,
  np: NowPlaying,
  atMs: number,
): TimelineState {
  const base = entryKey(np.title, np.artist)
  const incoming: TimelineEntry = {
    key: base,
    zone: "current",
    title: np.title,
    artist: np.artist,
    thumbnailUrl: np.thumbnailUrl,
    source: np.source,
    requestedByName: np.requestedByName,
    reason: np.reason,
    dedication: np.dedication,
    hasDedication: Boolean(np.dedication),
    witnessed: true,
  }

  // Same track still on air: refresh mutable fields, retire nothing, and keep
  // the established key so React does not remount the stage.
  if (s.current?.key === base) {
    return { ...s, current: { ...incoming, key: s.current.key } }
  }

  const taken = new Set(s.past.map((e) => e.key))
  const past = s.current
    ? [
        {
          ...s.current,
          zone: "past" as const,
          key: uniqueKey(s.current.key, taken),
          airedAt: new Date(atMs).toISOString(),
        },
        ...s.past,
      ]
    : s.past

  const future = s.future[0]?.key === base ? s.future.slice(1) : s.future

  return { ...s, current: incoming, future, past }
}

// TrackRequest has no artist field (it carries `channel`), so dedup here is
// by title alone — deliberately looser than entryKey.
export function ingestRequests(
  s: TimelineState,
  requests: TrackRequest[],
): TimelineState {
  const known = new Set<string>([
    ...s.future.map((e) => e.title),
    ...s.past.map((e) => e.title),
  ])
  if (s.current) known.add(s.current.title)

  const pending = requests
    .filter((r) => r.status !== "aired")
    .filter((r) => !known.has(r.title))
    .map((r) => ({
      key: `req:${r.id}`,
      zone: "pending" as const,
      title: r.title,
      thumbnailUrl: r.thumbnailUrl,
      source: r.source,
      requestedByName: r.requestedByName,
      status: r.status,
      witnessed: false,
    }))

  return { ...s, pending }
}
