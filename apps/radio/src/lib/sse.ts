// Generic reconnecting Server-Sent-Events channel, generalized from
// apps/the-button/src/lib/liveCounter.ts: full-jitter reconnect (uniform in
// [0,cap], cap 5s doubling per consecutive failure, 60s max), an optional
// polling fallback after N consecutive failures (until SSE recovers), and
// Page Visibility disconnect.
export type SseMode = "connecting" | "live" | "polling"

export interface SseChannelOptions<T> {
  url: string
  parse: (data: string) => T | null
  onEvent: (value: T) => void
  onModeChange?: (mode: SseMode) => void
  createEventSource?: (url: string) => EventSource
  poll?: { fetch: () => Promise<T>; baseMs?: number; jitterMs?: number; failuresBeforePolling?: number }
  random?: () => number
}

const RECONNECT_CAP_START_MS = 5_000
const RECONNECT_CAP_MAX_MS = 60_000

export function createSseChannel<T>(opts: SseChannelOptions<T>): { start(): void; stop(): void } {
  const random = opts.random ?? Math.random
  const create = opts.createEventSource ?? ((url: string) => new EventSource(url))
  const failuresBeforePolling = opts.poll?.failuresBeforePolling ?? 3
  const pollBase = opts.poll?.baseMs ?? 10_000
  const pollJitter = opts.poll?.jitterMs ?? 3_000

  let es: EventSource | null = null
  let failures = 0
  let polling = false
  let stopped = true
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  function stopPolling() {
    polling = false
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  }
  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    stopPolling()
    es?.close()
    es = null
  }
  async function pollLoop() {
    if (!opts.poll) return
    while (polling && !stopped) {
      try {
        const v = await opts.poll.fetch()
        if (!polling || stopped) return
        opts.onEvent(v)
      } catch { /* best effort */ }
      const delay = pollBase + (random() * 2 - 1) * pollJitter
      await new Promise<void>(res => { pollTimer = setTimeout(res, delay) })
      pollTimer = null
    }
  }
  function startPolling() {
    if (polling || !opts.poll) return
    polling = true
    opts.onModeChange?.("polling")
    void pollLoop()
  }
  function scheduleReconnect() {
    const cap = Math.min(RECONNECT_CAP_START_MS * 2 ** (failures - 1), RECONNECT_CAP_MAX_MS)
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect() }, random() * cap)
  }
  function connect() {
    const next = create(opts.url)
    es = next
    opts.onModeChange?.(polling ? "polling" : "connecting")
    next.onopen = () => { failures = 0; stopPolling(); opts.onModeChange?.("live") }
    next.onmessage = (e: MessageEvent) => {
      const v = opts.parse(String(e.data))
      if (v !== null) opts.onEvent(v)
    }
    next.onerror = () => {
      next.close()
      if (es !== next) return
      es = null
      if (stopped) return
      failures += 1
      if (failures >= failuresBeforePolling) startPolling()
      scheduleReconnect()
    }
  }
  function onVisibility() {
    if (stopped) return
    if (document.visibilityState === "hidden") disconnect()
    else if (!es && !reconnectTimer) { failures = 0; connect() }
  }

  return {
    start() {
      if (!stopped) return
      stopped = false
      document.addEventListener("visibilitychange", onVisibility)
      connect()
    },
    stop() {
      stopped = true
      document.removeEventListener("visibilitychange", onVisibility)
      disconnect()
    },
  }
}
