import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { radioCall } from "./api"
import { env } from "./env"
import type { StationRequestsResponse } from "./radio"
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
  move(requestId: string, delta: number): Promise<void>
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
  // Poll, SSE nudge, action refetch and page change all call load() and can be
  // in flight together, so the last ISSUED load wins rather than the last to
  // complete - otherwise a slow page-0 read lands after a page-1 read and the
  // list contradicts the pager. Same guard as use-llm-audit.ts.
  const reqIdRef = useRef(0)

  const load = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    const id = ++reqIdRef.current
    try {
      const w = await radioCall<ShowTimelineWire>(t, "/station/timeline", {
        limit,
        offset: pageRef.current * limit,
      })
      if (id !== reqIdRef.current) return
      const tl = toTimeline(w)
      setTimeline(tl)
      if (tl.serverNowMs) skewRef.current = tl.serverNowMs - Date.now()
      failingRef.current = false
    } catch (e) {
      if (id !== reqIdRef.current) return
      // Keep the last good snapshot. A stale timeline that still ticks beats
      // a blank one, and the next poll usually fixes it.
      if (!failingRef.current) {
        failingRef.current = true
        toast.error(msg(e))
      }
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }
  }, [limit])

  // Disarming the latch is the point: it exists to stop the 10s poll toasting
  // forever, but an operator who clicks Retry has asked for the answer and a
  // silent no-op reads as a dead button.
  const refresh = useCallback(() => {
    failingRef.current = false
    setNonce((n) => n + 1)
  }, [])

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

  // Reorder is all-or-nothing: the server compares the submitted ids against
  // EVERY request whose status is approved or ready and rejects anything that
  // is not exactly that set, in any order. The timeline's upcoming[] is a
  // strict subset of it - the walk keeps only ready rows and stops at the
  // 30-minute horizon - so the ids are read fresh from /station/requests,
  // which is built by the same query the server compares against. A GET, hence
  // no third argument.
  const move = useCallback(
    (requestId: string, delta: number) =>
      run(async () => {
        const t = tokenRef.current ?? ""
        const r = await radioCall<StationRequestsResponse>(t, "/station/requests")
        const ids = (r.pending ?? []).map((p) => p.id ?? "")
        const i = ids.indexOf(requestId)
        if (i < 0) {
          await load() // it aired or was removed while the row was on screen
          return
        }
        const j = i + delta
        if (j < 0 || j >= ids.length) return
        ;[ids[i], ids[j]] = [ids[j] ?? "", ids[i] ?? ""]
        try {
          await radioCall(t, "/station/requests/reorder", { ids })
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

  return { timeline, nowMs, loading, busy, page, setPage, refresh, skip, move, remove }
}
