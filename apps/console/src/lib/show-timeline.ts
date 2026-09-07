// Wire types and boundary normalisation for algovn.radio.v1.GetShowTimeline.
//
// protojson over the gateway: camelCase keys, zero-valued scalars OMITTED,
// int64 rendered as a decimal STRING. totalPast is int64 in the shipped
// radio.proto, so it arrives as "137" and Number() is mandatory; every other
// numeric here is int32 or double and needs only ?? 0. Normalising once at
// this boundary is what lets every component below assume real numbers.

export interface ShowSegmentWire {
  segmentId?: string
  kind?: string
  certainty?: string
  title?: string
  artist?: string
  thumbnailUrl?: string
  startedAt?: string
  durationS?: number
  source?: string
  requestedByName?: string
  reason?: string
  requestId?: string
  status?: string
  script?: string
  backsellTitle?: string
  promiseTitle?: string
  correlationId?: string
  model?: string
  inTokens?: number
  outTokens?: number
  costUsd?: number
  latencyMs?: number
}

export interface SessionMarkerWire {
  startedAt?: string
  endedAt?: string
}

export interface ShowTimelineWire {
  past?: ShowSegmentWire[]
  airing?: ShowSegmentWire
  upcoming?: ShowSegmentWire[]
  staging?: ShowSegmentWire[]
  sessions?: SessionMarkerWire[]
  breakGate?: string
  totalPast?: string | number
  serverNow?: string
}

export interface Segment {
  id: string
  kind: string
  certainty: string
  title: string
  artist: string
  thumbnailUrl: string
  startedAtMs: number
  durationMs: number
  source: string
  requestedByName: string
  reason: string
  requestId: string
  status: string
  script: string
  backsellTitle: string
  promiseTitle: string
  correlationId: string
  model: string
  inTokens: number
  outTokens: number
  costUsd: number
  latencyMs: number
}

export interface Session {
  startedAtMs: number
  endedAtMs: number | null
}

export interface Timeline {
  past: Segment[]
  airing: Segment | null
  upcoming: Segment[]
  staging: Segment[]
  sessions: Session[]
  breakGate: string
  totalPast: number
  serverNowMs: number
}

// The server's own default page size; its cap is 200.
export const PAST_PAGE_SIZE = 50

export const KIND_TRACK = "track"
export const KIND_DJ = "dj"
export const KIND_STATION_ID = "station_id"
export const KIND_UNKNOWN = "unknown"

// The honesty ladder. Only aired and airing are facts; everything else is a
// projection and the label has to say so.
export const CERTAINTY_LABEL: Record<string, string> = {
  aired: "aired",
  airing: "on air",
  committed: "next",
  prepared: "ready",
  projected: "projected",
  due: "có thể có",
  unknown: "shuffle",
  staging: "downloading",
}

// Each gate names the thing an operator must fix, cheapest fix last.
export const GATE_LABEL: Record<string, string> = {
  ok: "Breaks are on.",
  off_air: "Off air - no breaks because there is no air.",
  dj_disabled: "DJ disabled at deploy time - needs RADIO_DJ_ENABLED.",
  ai_paused: "AI paused - resume Tiểu Dương Dương above.",
  budget_reached: "Daily budget reached.",
  no_listeners: "Nobody listening - breaks are suppressed.",
}

export function isFact(certainty: string): boolean {
  return certainty === "aired" || certainty === "airing"
}

function epochMs(rfc3339?: string): number {
  if (!rfc3339) return 0
  const t = Date.parse(rfc3339)
  return Number.isNaN(t) ? 0 : t
}

export function toSegment(w: ShowSegmentWire): Segment {
  return {
    id: w.segmentId ?? "",
    kind: w.kind ?? "",
    certainty: w.certainty ?? "",
    title: w.title ?? "",
    artist: w.artist ?? "",
    thumbnailUrl: w.thumbnailUrl ?? "",
    startedAtMs: epochMs(w.startedAt),
    durationMs: (w.durationS ?? 0) * 1000,
    source: w.source ?? "",
    requestedByName: w.requestedByName ?? "",
    reason: w.reason ?? "",
    requestId: w.requestId ?? "",
    status: w.status ?? "",
    script: w.script ?? "",
    backsellTitle: w.backsellTitle ?? "",
    promiseTitle: w.promiseTitle ?? "",
    correlationId: w.correlationId ?? "",
    model: w.model ?? "",
    inTokens: w.inTokens ?? 0,
    outTokens: w.outTokens ?? 0,
    costUsd: w.costUsd ?? 0,
    latencyMs: w.latencyMs ?? 0,
  }
}

export function toTimeline(w: ShowTimelineWire): Timeline {
  return {
    past: (w.past ?? []).map(toSegment),
    airing: w.airing ? toSegment(w.airing) : null,
    upcoming: (w.upcoming ?? []).map(toSegment),
    staging: (w.staging ?? []).map(toSegment),
    sessions: (w.sessions ?? []).map((s) => ({
      startedAtMs: epochMs(s.startedAt),
      endedAtMs: s.endedAt ? epochMs(s.endedAt) : null,
    })),
    breakGate: w.breakGate ?? "",
    totalPast: Number(w.totalPast ?? 0),
    serverNowMs: epochMs(w.serverNow),
  }
}

export function hhmm(ms: number, timeZone?: string): string {
  if (!ms) return "--:--"
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  })
}

export function fmtDuration(ms: number): string {
  if (!ms) return "--"
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// The ribbon window, aligned to the server's 30-minute projection horizon
// (internal/timeline.HorizonS). Twenty minutes of past gives enough context to
// see the last break without shrinking the future into noise.
export const WINDOW_BEFORE_MS = 20 * 60_000
export const WINDOW_AFTER_MS = 30 * 60_000
const WINDOW_MS = WINDOW_BEFORE_MS + WINDOW_AFTER_MS

// A 12s station ID is 0.4% of the window - roughly three pixels. Breaks are
// the rows an operator most wants to click, so they get a floor.
export const MIN_BLOCK_PCT = 0.9

export interface Block {
  seg: Segment
  leftPct: number
  widthPct: number
  clippedLeft: boolean
  clippedRight: boolean
}

export function playheadPct(): number {
  return (WINDOW_BEFORE_MS / WINDOW_MS) * 100
}

// Segments are clipped to the window; one entirely outside is dropped from the
// ribbon (the detail list still shows it). A segment with no start time is
// dropped rather than pinned to the left edge, where it would read as a real
// block that aired 20 minutes ago.
export function layout(segs: Segment[], nowMs: number): Block[] {
  const from = nowMs - WINDOW_BEFORE_MS
  const to = nowMs + WINDOW_AFTER_MS
  const out: Block[] = []
  for (const seg of segs) {
    if (!seg.startedAtMs) continue
    const start = seg.startedAtMs
    const end = start + seg.durationMs
    if (end <= from || start >= to) continue
    const clippedLeft = start < from
    const clippedRight = end > to
    const visibleStart = Math.max(start, from)
    const visibleEnd = Math.min(end, to)
    const rawLeft = ((visibleStart - from) / WINDOW_MS) * 100
    const rawWidth = ((visibleEnd - visibleStart) / WINDOW_MS) * 100
    const widthPct = Math.min(Math.max(rawWidth, MIN_BLOCK_PCT), 100)
    // A sub-floor block near the right edge is nudged left rather than shrunk:
    // clickability is the whole point of the floor, and at these widths the
    // position error is smaller than the block itself.
    const leftPct = Math.min(rawLeft, 100 - widthPct)
    out.push({ seg, leftPct, widthPct, clippedLeft, clippedRight })
  }
  return out
}
