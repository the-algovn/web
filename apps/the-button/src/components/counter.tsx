import { type ReactNode, useEffect, useRef, useState } from "react"

const TWEEN_MS = 600

// Big number with a rAF ease-out tween: on change, it animates from the last
// shown value to the new total over TWEEN_MS and briefly brightens (tb-bump).
// `secondary` is an optional right-aligned readout that fills the wide accent
// box on desktop (the caller hides it on mobile, where the number owns the row).
export function Counter({
  total,
  secondary,
}: {
  total: number | null
  secondary?: ReactNode
}) {
  const [shown, setShown] = useState(0)
  const shownRef = useRef(0)
  const [bump, setBump] = useState(false)

  useEffect(() => {
    if (total === null) return
    const from = shownRef.current
    const to = total
    if (from === to) return
    setBump(true)
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
    const bt = setTimeout(() => setBump(false), 150)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(bt)
    }
  }, [total])

  const text = total === null ? "—" : shown.toLocaleString("en-US")
  return (
    <div className="tb-accent-box w-full max-w-3xl px-5 py-8 text-left">
      <div className="text-primary mb-2 font-mono text-xs tracking-widest">
        CURRENT_COUNT
      </div>
      <div className="flex items-end justify-between gap-6">
        <div
          data-testid="counter"
          aria-live="polite"
          className={
            "font-mono text-6xl leading-none font-bold tabular-nums tracking-tight sm:text-8xl " +
            (bump ? "[animation:tb-bump_0.15s_ease]" : "")
          }
        >
          {text}
        </div>
        {secondary}
      </div>
    </div>
  )
}
