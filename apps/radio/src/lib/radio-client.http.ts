import { type ApiClient, createApiClient } from "@algovn/api"
import {
  type ConnMode,
  type HistoryItem,
  type NowPlaying,
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

  const fetchNowPlaying = (): Promise<NowPlaying> =>
    request<unknown>("GET", "/now-playing").then(
      (r) => parseNowPlaying(r) ?? Promise.reject(new Error("bad now-playing")),
    )
  const fetchQueue = (): Promise<QueueItem[]> =>
    request<unknown>("GET", "/queue").then((r) => parseQueue(r) ?? [])

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

  return {
    getNowPlaying: fetchNowPlaying,
    getQueue: fetchQueue,
    getHistory: () => request<HistoryItem[]>("GET", "/history"),
    subscribeNowPlaying: (onEvent, onMode) =>
      subscribe<NowPlaying>(
        "radio.nowplaying",
        parseNowPlaying,
        fetchNowPlaying,
        onEvent,
        onMode,
      ),
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
