import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { radioCall } from "./api"
import { env } from "./env"
import type {
  HistoryWireItem,
  NowPlayingWire,
  Station,
  StationRequestsResponse,
  StationResponse,
  StationStats,
  TrackRequest,
} from "./radio"

export interface StationAdmin {
  station: Station | null
  stats: StationStats | null
  nowPlaying: NowPlayingWire | null
  pending: TrackRequest[]
  recent: TrackRequest[]
  history: HistoryWireItem[]
  loading: boolean
  busy: boolean
  goOnAir(): Promise<void>
  goOffAir(): Promise<void>
  setAIEnabled(enabled: boolean): Promise<void>
  skip(): Promise<void>
  reorder(ids: string[]): Promise<void>
  remove(id: string): Promise<void>
  refresh(): void
}

export interface UseStationOptions {
  pollMs?: number
  createEventSource?: (url: string) => EventSource
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// The operator's live view: 10s admin poll + the anonymous SSE channels as
// nudges (now-playing frames drive the card directly; queue frames trigger
// an admin refetch — the SSE payload deliberately lacks ids/status).
export function useStation(token: string | null, opts: UseStationOptions = {}): StationAdmin {
  const pollMs = opts.pollMs ?? 10_000
  const createES = opts.createEventSource ?? ((url: string) => new EventSource(url))
  const [station, setStation] = useState<Station | null>(null)
  const [stats, setStats] = useState<StationStats | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingWire | null>(null)
  const [pending, setPending] = useState<TrackRequest[]>([])
  const [recent, setRecent] = useState<TrackRequest[]>([])
  const [history, setHistory] = useState<HistoryWireItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const applyLists = useCallback((r: StationRequestsResponse) => {
    setPending(r.pending ?? [])
    setRecent(r.recent ?? [])
  }, [])

  const loadAdmin = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const [st, reqs] = await Promise.all([
        radioCall<StationResponse>(t, "/station"),
        radioCall<StationRequestsResponse>(t, "/station/requests"),
      ])
      setStation(st.station ?? {})
      setStats(st.stats ?? {})
      applyLists(reqs)
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setLoading(false)
    }
  }, [applyLists])

  const loadPublic = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const [np, h] = await Promise.all([
        radioCall<{ nowPlaying?: NowPlayingWire }>(t, "/now-playing"),
        radioCall<{ items?: HistoryWireItem[] }>(t, "/history"),
      ])
      setNowPlaying(np.nowPlaying ?? null)
      setHistory(h.items ?? [])
    } catch {
      // public reads are best-effort; the poll retries
    }
  }, [])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  // Poll loop (admin + public), re-armed on token/nonce changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a bump trigger for refresh(), not read in the body
  useEffect(() => {
    if (!token) return
    void loadAdmin()
    void loadPublic()
    const timer = setInterval(() => {
      void loadAdmin()
      void loadPublic()
    }, pollMs)
    return () => clearInterval(timer)
  }, [token, nonce, pollMs, loadAdmin, loadPublic])

  // SSE nudges — the channels are anonymous (EventSource cannot send auth).
  // biome-ignore lint/correctness/useExhaustiveDependencies: createES deliberately not a dep — options object identity churns per render
  useEffect(() => {
    if (!token) return
    const np = createES(`${env.eventsUrl}/radio.nowplaying`)
    np.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(String(e.data)) as Record<string, unknown> & NowPlayingWire
        if (raw.offAir === true) {
          setNowPlaying(null)
        } else {
          setNowPlaying(raw)
        }
        void loadPublic() // history moved on
      } catch {
        /* skip bad frame */
      }
    }
    const q = createES(`${env.eventsUrl}/radio.queue`)
    q.onmessage = () => {
      void loadAdmin() // frame lacks ids/status — refetch the rich lists
    }
    return () => {
      np.close()
      q.close()
    }
  }, [token, loadAdmin, loadPublic])

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (!tokenRef.current) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const stationAction = useCallback(
    (path: string, body?: unknown) =>
      run(async () => {
        const r = await radioCall<StationResponse>(tokenRef.current ?? "", path, body)
        setStation(r.station ?? {})
        if (r.stats) setStats(r.stats)
      }),
    [run],
  )

  const goOnAir = useCallback(() => stationAction("/station/on-air", {}), [stationAction])
  const goOffAir = useCallback(() => stationAction("/station/off-air", {}), [stationAction])
  const setAIEnabled = useCallback(
    (enabled: boolean) => stationAction("/station/ai", { enabled }),
    [stationAction],
  )

  const skip = useCallback(
    () =>
      run(async () => {
        await radioCall(tokenRef.current ?? "", "/station/skip", {})
      }),
    [run],
  )

  const reorder = useCallback(
    (ids: string[]) =>
      run(async () => {
        try {
          const r = await radioCall<StationRequestsResponse>(tokenRef.current ?? "", "/station/requests/reorder", { ids })
          applyLists(r)
        } catch (e) {
          await loadAdmin() // stale set — resync to server truth
          throw e
        }
      }),
    [run, applyLists, loadAdmin],
  )

  const remove = useCallback(
    (id: string) =>
      run(async () => {
        const r = await radioCall<StationRequestsResponse>(tokenRef.current ?? "", "/station/requests/remove", { id })
        applyLists(r)
      }),
    [run, applyLists],
  )

  return { station, stats, nowPlaying, pending, recent, history, loading, busy, goOnAir, goOffAir, setAIEnabled, skip, reorder, remove, refresh }
}
