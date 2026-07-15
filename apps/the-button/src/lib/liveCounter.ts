// EventSource wrapper for the anonymous channel the-button.counter (spec §10):
// full-jitter reconnect (uniform in [0,cap], cap 5s doubling per consecutive
// failure, 60s max), polling fallback via GetCounter every 10s±3s after >=3
// consecutive failures (until SSE recovers), and Page Visibility disconnect.
import { getCounter } from "./api"
import { env } from "./env"

export type CounterEvent = { type: "counter"; total: number; users?: number }
export type MilestoneEvent = { type: "milestone"; threshold: number; title: string }
export type LiveEvent = CounterEvent | MilestoneEvent

export type LiveMode = "connecting" | "live" | "polling"

export interface LiveCounterOptions {
  onEvent: (event: LiveEvent) => void
  onModeChange?: (mode: LiveMode) => void
  eventsUrl?: string
  createEventSource?: (url: string) => EventSource
  fetchTotal?: () => Promise<number>
  random?: () => number
}

const RECONNECT_CAP_START_MS = 5_000
const RECONNECT_CAP_MAX_MS = 60_000
const POLL_BASE_MS = 10_000
const POLL_JITTER_MS = 3_000
const FAILURES_BEFORE_POLLING = 3

export function parseLiveEvent(data: string): LiveEvent | null {
  try {
    const raw = JSON.parse(data) as Record<string, unknown>
    if (raw.type === "counter" && typeof raw.total === "number") {
      const event: CounterEvent = { type: "counter", total: raw.total }
      if (typeof raw.users === "number") event.users = raw.users
      return event
    }
    if (
      raw.type === "milestone" &&
      typeof raw.threshold === "number" &&
      typeof raw.title === "string"
    ) {
      return { type: "milestone", threshold: raw.threshold, title: raw.title }
    }
  } catch {
    // malformed frame — ignore
  }
  return null
}

export class LiveCounter {
  private es: EventSource | null = null
  private failures = 0
  private polling = false
  private stopped = true
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: LiveCounterOptions) {}

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
      this.disconnect() // frees a server connection while the tab is hidden
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
    this.stopPolling()
    this.es?.close()
    this.es = null
  }

  private connect(): void {
    const create = this.opts.createEventSource ?? ((url: string) => new EventSource(url))
    const es = create(this.opts.eventsUrl ?? env.eventsUrl)
    this.es = es
    this.opts.onModeChange?.(this.polling ? "polling" : "connecting")
    es.onopen = () => {
      this.failures = 0
      this.stopPolling()
      this.opts.onModeChange?.("live")
    }
    es.onmessage = (e: MessageEvent) => {
      const event = parseLiveEvent(String(e.data))
      if (event) this.opts.onEvent(event)
    }
    es.onerror = () => {
      // We own the backoff: close instead of relying on native EventSource
      // retry (which cannot jitter across 10k clients).
      es.close()
      if (this.es !== es) return
      this.es = null
      if (this.stopped) return
      this.failures += 1
      if (this.failures >= FAILURES_BEFORE_POLLING) this.startPolling()
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    const cap = Math.min(RECONNECT_CAP_START_MS * 2 ** (this.failures - 1), RECONNECT_CAP_MAX_MS)
    const random = this.opts.random ?? Math.random
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, random() * cap)
  }

  private startPolling(): void {
    if (this.polling) return
    this.polling = true
    this.opts.onModeChange?.("polling")
    void this.pollLoop()
  }

  private stopPolling(): void {
    this.polling = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async pollLoop(): Promise<void> {
    const random = this.opts.random ?? Math.random
    const fetchTotal =
      this.opts.fetchTotal ?? (async () => Number((await getCounter()).total ?? "0"))
    while (this.polling && !this.stopped) {
      try {
        const total = await fetchTotal()
        if (!this.polling || this.stopped) return
        this.opts.onEvent({ type: "counter", total })
      } catch {
        // polling is best-effort; the next attempt may succeed
      }
      const delay = POLL_BASE_MS + (random() * 2 - 1) * POLL_JITTER_MS // 10s ± 3s
      await new Promise<void>(resolve => {
        this.pollTimer = setTimeout(resolve, delay)
      })
      this.pollTimer = null
    }
  }
}
