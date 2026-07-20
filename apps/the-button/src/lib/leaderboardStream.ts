// EventSource wrapper for the anonymous the-button.leaderboard channel: it
// receives a full top-20 board (all-time + weekly) every ~3s. Simpler than
// LiveCounter — a stale board is harmless, so there is no polling fallback,
// only jittered reconnect and a Page-Visibility disconnect.
import { env } from "./env"

export type Row = { rank: number; name: string; clicks: number }
export type LeaderboardFrame = { allTime: Row[]; thisWeek: Row[] }

export interface LeaderboardStreamOptions {
  onFrame: (frame: LeaderboardFrame) => void
  eventsUrl?: string
  createEventSource?: (url: string) => EventSource
  random?: () => number
}

const RECONNECT_CAP_MS = 15_000

function parseRows(v: unknown): Row[] {
  if (!Array.isArray(v)) return []
  const out: Row[] = []
  for (const r of v) {
    if (
      r &&
      typeof r === "object" &&
      typeof (r as Row).rank === "number" &&
      typeof (r as Row).name === "string" &&
      typeof (r as Row).clicks === "number"
    ) {
      out.push({
        rank: (r as Row).rank,
        name: (r as Row).name,
        clicks: (r as Row).clicks,
      })
    }
  }
  return out
}

export function parseLeaderboardEvent(data: string): LeaderboardFrame | null {
  try {
    const raw = JSON.parse(data) as Record<string, unknown>
    if (raw.type !== "leaderboard") return null
    return {
      allTime: parseRows(raw.allTime),
      thisWeek: parseRows(raw.thisWeek),
    }
  } catch {
    return null
  }
}

export class LeaderboardStream {
  private es: EventSource | null = null
  private stopped = true
  private failures = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: LeaderboardStreamOptions) {}

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    document.addEventListener("visibilitychange", this.onVisibility)
    this.connect()
  }

  stop(): void {
    this.stopped = true
    document.removeEventListener("visibilitychange", this.onVisibility)
    this.disconnect()
  }

  private onVisibility = (): void => {
    if (this.stopped) return
    if (document.visibilityState === "hidden") {
      this.disconnect()
    } else if (!this.es && !this.reconnectTimer) {
      this.failures = 0
      this.connect()
    }
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.es?.close()
    this.es = null
  }

  private connect(): void {
    const create =
      this.opts.createEventSource ?? ((url: string) => new EventSource(url))
    const es = create(this.opts.eventsUrl ?? env.eventsLeaderboardUrl)
    this.es = es
    es.onopen = () => {
      this.failures = 0
    }
    es.onmessage = (e: MessageEvent) => {
      const frame = parseLeaderboardEvent(String(e.data))
      if (frame) this.opts.onFrame(frame)
    }
    es.onerror = () => {
      es.close()
      if (this.es !== es || this.stopped) return
      this.es = null
      this.failures += 1
      const cap = Math.min(RECONNECT_CAP_MS, 1000 * 2 ** (this.failures - 1))
      const random = this.opts.random ?? Math.random
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, random() * cap)
    }
  }
}
