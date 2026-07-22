import { type ApiClient, createApiClient } from "@algovn/api"
import {
  type ConnMode,
  type NowPlaying,
  parseHistoryItem,
  parseNowPlaying,
  parseQueue,
  type QueueItem,
  type RadioClient,
} from "./radio-client"
import { createSseChannel, type SseMode } from "./sse"

export interface HttpClientDeps {
  request?: ApiClient["request"]
  createEventSource?: (url: string) => EventSource
}

const asConnMode = (m: SseMode): ConnMode => m

export function createHttpClient(opts: {
  apiBase: string
  eventsUrl: string
  deps?: HttpClientDeps
}): RadioClient {
  const request =
    opts.deps?.request ?? createApiClient({ baseUrl: opts.apiBase }).request

  // REST responses are protojson envelopes; SSE frames are the engine's raw
  // JSON. Absent nowPlaying (REST) or {"offAir":true} (SSE) means off-air.
  const fetchNowPlaying = (): Promise<NowPlaying | null> =>
    request<{ nowPlaying?: unknown }>("GET", "/now-playing").then((r) => {
      if (r === null || typeof r !== "object" || r.nowPlaying === undefined)
        return null
      const np = parseNowPlaying(r.nowPlaying)
      return np ?? Promise.reject(new Error("bad now-playing"))
    })
  const fetchQueue = (): Promise<QueueItem[]> =>
    request<{ items?: unknown }>("GET", "/queue").then(
      (r) => parseQueue(r.items ?? []) ?? [],
    )

  function subscribe<T>(
    channel: string,
    parse: (raw: unknown) => T | null,
    fetchNow: () => Promise<T>,
    onEvent: (v: T) => void,
    onMode?: (m: ConnMode) => void,
  ): () => void {
    const ch = createSseChannel<T>({
      url: `${opts.eventsUrl}/${channel}`,
      parse: (data) => {
        try {
          return parse(JSON.parse(data))
        } catch {
          return null
        }
      },
      onEvent,
      onModeChange: onMode ? (m) => onMode(asConnMode(m)) : undefined,
      createEventSource: opts.deps?.createEventSource,
      poll: { fetch: fetchNow },
    })
    ch.start()
    return () => ch.stop()
  }

  // null from the generic channel still means "invalid frame, skip"; off-air
  // needs a distinct marker so it can round-trip through onEvent(null).
  type NpFrame = NowPlaying | "offair"

  return {
    getNowPlaying: fetchNowPlaying,
    getQueue: fetchQueue,
    getHistory: () =>
      request<{ items?: unknown[] }>("GET", "/history").then((r) =>
        (r.items ?? []).flatMap((x) => parseHistoryItem(x) ?? []),
      ),
    subscribeNowPlaying: (onEvent, onMode) => {
      const ch = createSseChannel<NpFrame>({
        url: `${opts.eventsUrl}/radio.nowplaying`,
        parse: (data) => {
          try {
            const raw = JSON.parse(data) as Record<string, unknown>
            if (raw.offAir === true) return "offair"
            return parseNowPlaying(raw)
          } catch {
            return null
          }
        },
        onEvent: (v) => onEvent(v === "offair" ? null : v),
        onModeChange: onMode ? (m) => onMode(asConnMode(m)) : undefined,
        createEventSource: opts.deps?.createEventSource,
        poll: {
          fetch: () =>
            fetchNowPlaying().then((np) => np ?? ("offair" as const)),
        },
      })
      ch.start()
      return () => ch.stop()
    },
    subscribeQueue: (onEvent, onMode) =>
      subscribe<QueueItem[]>(
        "radio.queue",
        parseQueue,
        fetchQueue,
        onEvent,
        onMode,
      ),
    heartbeat: (sessionId) =>
      request<void>("POST", "/heartbeat", { sessionId }).then(() => undefined),
  }
}
