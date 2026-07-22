import { useEffect, useRef, useState } from "react"
import type { HistoryItem, NowPlaying, QueueItem } from "./radio-client"
import type { TrackRequest } from "./request-client"
import {
  EMPTY,
  ingestNowPlaying,
  ingestQueue,
  ingestRequests,
  seed,
  type TimelineState,
} from "./timeline"

export interface UseTimelineInput {
  nowPlaying: NowPlaying | null
  queue: QueueItem[]
  history: HistoryItem[]
  requests: TrackRequest[]
  now?: () => number
}

// Thin wrapper: all logic lives in the reducer. Seeding happens exactly once,
// on the first signal that the station has said anything — after that our own
// accrual owns `past`, and later history refreshes are deliberately ignored
// because they carry strictly less than what we witnessed.
export function useTimeline(input: UseTimelineInput): TimelineState {
  const { nowPlaying, queue, history, requests } = input
  const [state, setState] = useState<TimelineState>(EMPTY)
  const seeded = useRef(false)
  const nowRef = useRef<() => number>(input.now ?? Date.now)

  useEffect(() => {
    nowRef.current = input.now ?? Date.now
  }, [input.now])

  useEffect(() => {
    if (seeded.current) return
    if (history.length === 0 && nowPlaying === null) return
    seeded.current = true
    setState(seed({ history, queue }))
  }, [history, queue, nowPlaying])

  useEffect(() => {
    if (!seeded.current) return
    setState((s) => ingestQueue(s, queue))
  }, [queue])

  // `nowPlaying` keeps object identity between playhead ticks — the sync
  // buffer returns the same reference until the track actually changes — so
  // this effect fires only on a real transition.
  useEffect(() => {
    if (!seeded.current || !nowPlaying) return
    setState((s) => ingestNowPlaying(s, nowPlaying, nowRef.current()))
  }, [nowPlaying])

  useEffect(() => {
    setState((s) => ingestRequests(s, requests))
  }, [requests])

  return state
}
