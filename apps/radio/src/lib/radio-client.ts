import { env } from "./env"
import { MockStudio } from "./mock-studio"
import { createHttpClient } from "./radio-client.http"

export type ItemKind = "track" | "dj" | "jingle"

export interface NowPlaying {
  kind: ItemKind
  title: string
  artist?: string
  thumbnailUrl?: string
  dedication?: string
  startedAt: string // RFC3339 — the ear-sync anchor
  durationSeconds: number
  listeners: number
  source?: "listener" | "ai"
  requestedByName?: string
  reason?: string
}

export interface QueueItem {
  title: string
  artist?: string
  thumbnailUrl?: string
  hasDedication: boolean // never the recipient — no spoiled surprises
  source?: "listener" | "ai"
  requestedByName?: string
  reason?: string
}

export interface HistoryItem {
  title: string
  artist?: string
  thumbnailUrl?: string
  airedAt: string
  source?: "listener" | "ai"
  requestedByName?: string
  reason?: string
}

export type ConnMode = "connecting" | "live" | "polling" | "offline"

export interface RadioClient {
  getNowPlaying(): Promise<NowPlaying | null>
  getQueue(): Promise<QueueItem[]>
  getHistory(): Promise<HistoryItem[]>
  subscribeNowPlaying(
    onEvent: (np: NowPlaying | null) => void,
    onMode?: (m: ConnMode) => void,
  ): () => void
  subscribeQueue(
    onEvent: (q: QueueItem[]) => void,
    onMode?: (m: ConnMode) => void,
  ): () => void
  heartbeat(sessionId: string): Promise<void>
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined

export function parseNowPlaying(raw: unknown): NowPlaying | null {
  if (typeof raw !== "object" || raw === null) return null
  const r = raw as Record<string, unknown>
  const kind = r.kind
  if (kind !== "track" && kind !== "dj" && kind !== "jingle") return null
  if (typeof r.title !== "string" || typeof r.startedAt !== "string")
    return null
  if (typeof r.durationSeconds !== "number") return null
  const listeners = typeof r.listeners === "number" ? r.listeners : 0
  const np: NowPlaying = {
    kind,
    title: r.title,
    startedAt: r.startedAt,
    durationSeconds: r.durationSeconds,
    listeners,
  }
  if (str(r.artist)) np.artist = str(r.artist)
  if (str(r.thumbnailUrl)) np.thumbnailUrl = str(r.thumbnailUrl)
  if (str(r.dedication)) np.dedication = str(r.dedication)
  if (r.source === "listener" || r.source === "ai") np.source = r.source
  if (str(r.requestedByName)) np.requestedByName = str(r.requestedByName)
  if (str(r.reason)) np.reason = str(r.reason)
  return np
}

export function parseQueue(raw: unknown): QueueItem[] | null {
  if (!Array.isArray(raw)) return null
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return []
    const e = entry as Record<string, unknown>
    if (typeof e.title !== "string") return []
    const item: QueueItem = {
      title: e.title,
      hasDedication: e.hasDedication === true,
    }
    if (str(e.artist)) item.artist = str(e.artist)
    if (str(e.thumbnailUrl)) item.thumbnailUrl = str(e.thumbnailUrl)
    if (e.source === "listener" || e.source === "ai") item.source = e.source
    if (str(e.requestedByName)) item.requestedByName = str(e.requestedByName)
    if (str(e.reason)) item.reason = str(e.reason)
    return [item] // recipient (if present) is deliberately dropped
  })
}

export function createClient(): RadioClient {
  return env.useMock
    ? new MockStudio()
    : createHttpClient({ apiBase: env.apiBase, eventsUrl: env.eventsUrl })
}
