import { useEffect, useRef, useState } from "react"

const TWEEN_MS = 600

// Big number with an ease-out tween on change (SSE ticks at 1s; the tween
// makes each tick feel alive without re-rendering more than rAF allows).
export function Counter({ total }: { total: number | null }) {
  const [shown, setShown] = useState(0)
  const shownRef = useRef(0)

  useEffect(() => {
    if (total === null) return
    const from = shownRef.current
    const to = total
    if (from === to) return
    const started = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min((now - started) / TWEEN_MS, 1)
      const eased = 1 - (1 - t) ** 3
      const value = Math.round(from + (to - from) * eased)
      shownRef.current = value
      setShown(value)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [total])

  return (
    <div
      data-testid="counter"
      aria-live="polite"
      className="font-mono text-6xl font-semibold tabular-nums tracking-tight sm:text-8xl"
    >
      {total === null ? "—" : shown.toLocaleString("en-US")}
    </div>
  )
}
