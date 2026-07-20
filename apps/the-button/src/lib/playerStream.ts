// Authenticated per-user SSE consumer for /events/the-button.user (spec
// plan 5, Task 3). Browser EventSource cannot set an Authorization header,
// so this streams via fetch() + a ReadableStream reader and parses SSE
// frames by hand. Mirrors liveCounter.ts's full-jitter reconnect backoff
// and Page Visibility handling.
import type { QuestProgress } from "./api"

export interface UserFrame {
  total: number
  allTimeRank: number
  weeklyRank: number
  unlocked: { id: string; title: string; description: string }[]
  questProgress: QuestProgress[]
  questsDone: string[]
  streak: { current: number; best: number; lastDay: string }
}

export interface PlayerStreamOptions {
  url: string // env.eventsPlayerUrl
  getToken: () => string | null // current OIDC access token
  onFrame: (f: UserFrame) => void
  onError?: (e: unknown) => void
  random?: () => number
}

const RECONNECT_CAP_START_MS = 5_000
const RECONNECT_CAP_MAX_MS = 60_000
const TOKEN_RETRY_MS = 500

export function parseUserFrame(json: unknown): UserFrame | null {
  try {
    if (typeof json !== "object" || json === null) return null
    const raw = json as Record<string, unknown>
    if (raw.type !== "user") return null

    const streakRaw = raw.streak
    if (typeof streakRaw !== "object" || streakRaw === null) return null
    const streak = streakRaw as Record<string, unknown>

    const unlockedRaw = Array.isArray(raw.unlocked) ? raw.unlocked : []
    const unlocked = unlockedRaw.map((u) => {
      const r = (u ?? {}) as Record<string, unknown>
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? ""),
        description: String(r.description ?? ""),
      }
    })

    const questProgressRaw = Array.isArray(raw.questProgress)
      ? raw.questProgress
      : []
    const questProgress: QuestProgress[] = questProgressRaw.map((q) => {
      const r = (q ?? {}) as Record<string, unknown>
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? ""),
        description: String(r.description ?? ""),
        kind: r.kind === "weekly" ? "weekly" : "daily",
        target: Number(r.target ?? 0),
        progress: Number(r.progress ?? 0),
        done: r.done === true,
        reward: String(r.reward ?? ""),
      }
    })

    const questsDone = Array.isArray(raw.questsDone)
      ? raw.questsDone.map(String)
      : []

    return {
      total: Number(raw.total ?? 0),
      allTimeRank: Number(raw.allTimeRank ?? 0),
      weeklyRank: Number(raw.weeklyRank ?? 0),
      unlocked,
      questProgress,
      questsDone,
      streak: {
        current: Number(streak.count ?? 0),
        best: Number(streak.best ?? 0),
        lastDay: String(streak.lastDay ?? ""),
      },
    }
  } catch {
    // malformed frame — never throw
    return null
  }
}

export class PlayerStream {
  private controller: AbortController | null = null
  private failures = 0
  private stopped = true
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: PlayerStreamOptions) {}

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
    } else if (!this.controller && !this.reconnectTimer) {
      this.failures = 0
      this.connect()
    }
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.controller?.abort()
    this.controller = null
  }

  private connect(): void {
    const token = this.opts.getToken()
    if (!token) {
      // token is mid-renewal — retry shortly rather than fetching unauthenticated
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        if (!this.stopped) this.connect()
      }, TOKEN_RETRY_MS)
      return
    }

    const controller = new AbortController()
    this.controller = controller
    void this.run(token, controller)
  }

  private async run(token: string, controller: AbortController): Promise<void> {
    try {
      const resp = await fetch(this.opts.url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      })
      if (!resp.ok || !resp.body) {
        throw new Error(`player stream failed: ${resp.status}`)
      }
      this.failures = 0
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        // Normalize CRLF -> LF up front: the gateway emits LF today, but a
        // proxy could rewrite to CRLF, and doing this after each chunk
        // append (rather than once per line) still handles a "\r\n" that
        // straddles a read() chunk boundary once its "\n" half arrives.
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(
          /\r\n/g,
          "\n",
        )
        buffer = this.consumeBuffer(buffer)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return // stop(): not a failure
      this.opts.onError?.(err)
    }

    if (this.controller !== controller) return // superseded by a later connect()
    this.controller = null
    if (this.stopped) return
    this.failures += 1
    this.scheduleReconnect()
  }

  private consumeBuffer(buffer: string): string {
    for (;;) {
      const idx = buffer.indexOf("\n\n")
      if (idx === -1) break
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      this.handleEvent(rawEvent)
    }
    return buffer
  }

  private handleEvent(rawEvent: string): void {
    const dataLines: string[] = []
    for (const line of rawEvent.split("\n")) {
      if (line.startsWith(":")) continue // comment / heartbeat
      if (line.startsWith("retry:") || line.startsWith("event:")) continue
      if (line.startsWith("data:")) {
        dataLines.push(
          line.startsWith("data: ") ? line.slice(6) : line.slice(5),
        )
      }
    }
    if (dataLines.length === 0) return
    try {
      const json = JSON.parse(dataLines.join("\n"))
      const frame = parseUserFrame(json)
      if (frame) this.opts.onFrame(frame)
    } catch {
      // malformed frame — ignore
    }
  }

  private scheduleReconnect(): void {
    const cap = Math.min(
      RECONNECT_CAP_START_MS * 2 ** (this.failures - 1),
      RECONNECT_CAP_MAX_MS,
    )
    const random = this.opts.random ?? Math.random
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, random() * cap)
  }
}
