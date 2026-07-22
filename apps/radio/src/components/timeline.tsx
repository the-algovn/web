import { useEffect, useLayoutEffect, useRef } from "react"
import type { TimelineState } from "../lib/timeline"
import { useNowTick } from "../lib/use-now-tick"
import { NowMarker } from "./now-marker"
import { TimelineRow } from "./timeline-row"

// Where the NOW marker sits when the timeline first settles: far enough down
// that a couple of future rows peek above it, so the upward direction is
// discoverable. Landing at scroll-top would show the furthest-future item,
// the least interesting thing on the page.
const REST_FRACTION = 0.25

export function Timeline({
  state,
  elapsedS,
  remainingS,
}: {
  state: TimelineState
  elapsedS: number
  remainingS: number
}) {
  const nowMs = useNowTick()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<HTMLDivElement | null>(null)
  const settled = useRef(false)
  // Distance from the bottom, captured before a mutation and restored after.
  const anchor = useRef<number | null>(null)

  // Rest position, once, as soon as there is anything to rest against.
  useEffect(() => {
    if (settled.current) return
    const scroller = scrollRef.current
    const marker = markerRef.current
    if (!scroller || !marker || scroller.scrollHeight === 0) return
    settled.current = true
    scroller.scrollTop = Math.max(
      0,
      marker.offsetTop - scroller.clientHeight * REST_FRACTION,
    )
  }, [])

  // Manual scroll anchoring. CSS overflow-anchor handles this in Chrome and
  // Firefox but Safari does not implement it, and Safari is the primary
  // target — so measure from the bottom before the DOM changes and restore
  // afterwards, which keeps whatever the reader is looking at still.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !settled.current) return
    if (anchor.current !== null) {
      scroller.scrollTop = scroller.scrollHeight - anchor.current
    }
    anchor.current = scroller.scrollHeight - scroller.scrollTop
  })

  const futureTopDown = [...state.future].reverse()

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label="Dòng thời gian của đài"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      {state.pending.map((entry) => (
        <TimelineRow key={entry.key} entry={entry} nowMs={nowMs} />
      ))}

      {futureTopDown.length === 0 && state.pending.length === 0 && (
        <p className="px-3 py-4 text-center text-xs text-[color:var(--muted-foreground)]">
          đài đang chọn bài…
        </p>
      )}
      {futureTopDown.map((entry) => (
        <TimelineRow key={entry.key} entry={entry} nowMs={nowMs} />
      ))}

      <div ref={markerRef}>
        <NowMarker elapsedS={elapsedS} remainingS={remainingS} />
      </div>

      {state.past.length === 0 && (
        <p className="px-3 py-4 text-center text-xs text-[color:var(--muted-foreground)]">
          chưa có bài nào phát trong phiên này
        </p>
      )}
      {state.past.map((entry) => (
        <TimelineRow key={entry.key} entry={entry} nowMs={nowMs} />
      ))}
    </div>
  )
}
