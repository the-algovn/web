import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { radioCall } from "./api"
import { env } from "./env"
import { PAST_PAGE_SIZE, type ShowTimelineWire, type Timeline, toTimeline } from "./show-timeline"

export interface UseShowTimelineOptions {
  pollMs?: number
  tickMs?: number
  limit?: number
  createEventSource?: (url: string) => EventSource
}

export interface ShowTimelineState {
  timeline: Timeline | null
  nowMs: number
  loading: boolean
  busy: boolean
  page: number
  setPage(p: number): void
  refresh(): void
  skip(): Promise<void>
  reorder(ids: string[]): Promise<void>
  remove(id: string): Promise<void>
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// The operator's show view. Three clocks, deliberately separate: a 1s local
// tick drives the playhead with no network, a 10s POST is the snapshot, and
// SSE is only a nudge - the channels are anonymous (EventSource cannot send
// Authorization) so their frames carry no ids, status or script.
export function useShowTimeline(
  token: string | null,
  opts: UseShowTimelineOptions = {},
): ShowTimelineState {
  const pollMs = opts.pollMs ?? 10_000
  const tickMs = opts.tickMs ?? 1_000
  const limit = opts.limit ?? PAST_PAGE_SIZE
  const createES = opts.createEventSource ?? ((url: string) => new EventSource(url))

  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [nonce, setNonce] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const tokenRef = useRef(token)
  tokenRef.current = token
  const pageRef = useRef(page)
  pageRef.current = page
  // Offset between the server's clock and this browser's. Applied to every
  // playhead tick so a skewed laptop does not draw the playhead inside the
  // wrong segment.
  const skewRef = useRef(0)
  // A poll failure is a single toast, not one per 10s forever.
  const failingRef = useRef(false)

  const load = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const w = await radioCall<ShowTimelineWire>(t, "/station/timeline", {
        limit,
        offset: pageRef.current * limit,
      })
      const tl = toTimeline(w)
      setTimeline(tl)
      if (tl.serverNowMs) skewRef.current = tl.serverNowMs - Date.now()
      failingRef.current = false
    } catch (e) {
      // Keep the last good snapshot. A stale timeline that still ticks beats
      // a blank one, and the next poll usually fixes it.
      if (!failingRef.current) {
        failingRef.current = true
        toast.error(msg(e))
      }
    } finally {
      setLoading(false)
    }
  }, [limit])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a bump trigger for refresh(), not read in the body
  useEffect(() => {
    if (!token) return
    void load()
    const id = setInterval(() => void load(), pollMs)
    return () => clearInterval(id)
  }, [token, page, nonce, pollMs, load])

  // The playhead. Never gated on the poll succeeding.
  useEffect(() => {
    const apply = () => setNowMs(Date.now() + skewRef.current)
    apply()
    const id = setInterval(apply, tickMs)
    return () => clearInterval(id)
  }, [tickMs])

  // biome-ignore lint/correctness/useExhaustiveDependencies: createES deliberately not a dep - options object identity churns per render
  useEffect(() => {
    if (!token) return
    const np = createES(`${env.eventsUrl}/radio.nowplaying`)
    np.onmessage = () => void load()
    const q = createES(`${env.eventsUrl}/radio.queue`)
    q.onmessage = () => void load()
    return () => {
      np.close()
      q.close()
    }
  }, [token, load])

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

  const skip = useCallback(
    () =>
      run(async () => {
        await radioCall(tokenRef.current ?? "", "/station/skip", {})
        await load()
      }),
    [run, load],
  )

  // The whole id list is resubmitted every time; the server rejects a stale
  // set, and the only correct response to that is to resync rather than to
  // retry a set built from a timeline that has already moved.
  const reorder = useCallback(
    (ids: string[]) =>
      run(async () => {
        try {
          await radioCall(tokenRef.current ?? "", "/station/requests/reorder", { ids })
        } finally {
          await load()
        }
      }),
    [run, load],
  )

  const remove = useCallback(
    (id: string) =>
      run(async () => {
        await radioCall(tokenRef.current ?? "", "/station/requests/remove", { id })
        await load()
      }),
    [run, load],
  )

  return { timeline, nowMs, loading, busy, page, setPage, refresh, skip, reorder, remove }
}
