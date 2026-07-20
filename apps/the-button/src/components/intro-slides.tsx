import { useEffect, useRef, useState } from "react"
import { TARGET } from "../lib/progress"
import { WHY } from "./why-grid"

export type IntroDoneReason = "finished" | "skipped"

const SLIDE_COUNT = 5

// The first-visit walkthrough: why → count vs target → the button → quests &
// achievements → community. Purely presentational — live values arrive as
// props from Home, and finishing or skipping is the caller's signal to set
// the intro-seen flag. The real button is on the page behind this overlay;
// the slideshow itself contains nothing pressable but its own controls.
export function IntroSlides({
  total,
  etaText,
  topNames,
  questCount,
  achievementCount,
  onDone,
}: {
  total: number | null
  etaText: string
  topNames: string[]
  questCount: number
  achievementCount: number
  onDone: (reason: IntroDoneReason) => void
}) {
  const [slide, setSlide] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const next = () => setSlide((s) => Math.min(s + 1, SLIDE_COUNT - 1))
  const back = () => setSlide((s) => Math.max(s - 1, 0))

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onDone("skipped")
      return
    }
    if (e.key === "ArrowRight") {
      next()
      return
    }
    if (e.key === "ArrowLeft") {
      back()
      return
    }
    if (e.key !== "Tab") return
    const root = dialogRef.current
    if (!root) return
    const focusables = Array.from(root.querySelectorAll<HTMLElement>("button"))
    const first = focusables.at(0)
    const last = focusables.at(-1)
    if (!first || !last) return
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="intro"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="tb-intro"
    >
      <div className="flex w-full max-w-xl flex-col gap-6 p-6">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground tracking-widest">
            {String(slide + 1).padStart(2, "0")}/0{SLIDE_COUNT}
          </span>
          <button
            type="button"
            onClick={() => onDone("skipped")}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            skip ›
          </button>
        </div>

        <div className="tb-slide" key={slide}>
          <SlideBody
            slide={slide}
            total={total}
            etaText={etaText}
            topNames={topNames}
            questCount={questCount}
            achievementCount={achievementCount}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={slide === 0}
            className="tb-ghost px-4 py-2 font-mono text-xs disabled:invisible"
          >
            ‹ BACK
          </button>
          <div className="flex gap-2">
            {Array.from({ length: SLIDE_COUNT }, (_, n) => n).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`slide ${n + 1}`}
                aria-current={n === slide}
                onClick={() => setSlide(n)}
                className={`h-2 w-2 border ${
                  n === slide ? "bg-primary border-primary" : "border-border"
                }`}
              />
            ))}
          </div>
          {slide < SLIDE_COUNT - 1 ? (
            <button
              type="button"
              onClick={next}
              className="tb-ghost px-4 py-2 font-mono text-xs"
            >
              NEXT ›
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDone("finished")}
              className="tb-ghost text-primary px-4 py-2 font-mono text-xs font-bold"
            >
              [ START CLICKING ]
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SlideBody({
  slide,
  total,
  etaText,
  topNames,
  questCount,
  achievementCount,
}: {
  slide: number
  total: number | null
  etaText: string
  topNames: string[]
  questCount: number
  achievementCount: number
}) {
  const h2 = "text-muted-foreground mb-4 font-mono text-sm"
  switch (slide) {
    case 0:
      return (
        <div>
          <h2 className={h2}>{"// why?"}</h2>
          <ul className="flex flex-col gap-3">
            {WHY.map((reason, i) => (
              <li key={reason} className="flex items-start gap-3">
                <span className="text-primary font-mono text-xs tabular-nums">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
                <span className="text-foreground text-lg leading-snug">
                  {reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 1:
      return (
        <div>
          <h2 className={h2}>{"// the count"}</h2>
          <div className="text-primary font-mono text-3xl font-bold tabular-nums break-all">
            {total === null ? "…" : total.toLocaleString("en-US")}
          </div>
          <div className="text-muted-foreground mt-2 font-mono text-sm tabular-nums break-all">
            of {TARGET.toLocaleString("en-US")}
          </div>
          <div className="mt-4 flex items-baseline gap-2 font-mono text-xs">
            <span className="text-muted-foreground tracking-[0.1em]">ETA</span>
            <span className="text-primary font-bold">{etaText}</span>
          </div>
        </div>
      )
    case 2:
      return (
        <div>
          <h2 className={h2}>{"// the button"}</h2>
          <p className="text-foreground text-lg">
            one press = one click. forever.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            no multipliers on the count, no shortcuts — just you and everyone
            else, one press at a time.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            sign in once and every press lands in the global total.
          </p>
        </div>
      )
    case 3:
      return (
        <div>
          <h2 className={h2}>{"// quests & achievements"}</h2>
          <p className="text-foreground text-lg">
            {achievementCount} achievements to unlock.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            daily and weekly quests
            {questCount > 0 ? ` (${questCount} live right now)` : ""}, streaks
            to keep alive, levels to climb — all cosmetic, all yours.
          </p>
        </div>
      )
    default:
      return (
        <div>
          <h2 className={h2}>{"// you're not alone"}</h2>
          <p className="text-foreground text-lg">
            {topNames.length > 0
              ? `top clickers right now: ${topNames.join(", ")}`
              : "the board is empty — be the first name on it"}
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            a live leaderboard and activity feed tick away on the page behind
            this. your name belongs there.
          </p>
        </div>
      )
  }
}
