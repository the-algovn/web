import { mmss } from "../lib/format"
import type { Progress } from "../lib/progress"

// The playhead ticks every 500ms, which is too coarse for a smooth bar, so
// the fill interpolates between ticks with a linear transition. Under
// prefers-reduced-motion the .radio-progress-fill rule in index.css drops the
// transition — the value keeps updating, only the tweening stops.
export function ProgressBar({ progress }: { progress: Progress }) {
  const total = Math.round(progress.elapsedS + progress.remainingS)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuenow={Math.round(progress.elapsedS)}
      aria-valuemax={total}
      aria-valuetext={`${mmss(progress.elapsedS)} / ${mmss(total)}`}
      className="relative h-[3px] w-full overflow-hidden"
      style={{ background: "rgb(232 233 230 / 0.13)" }}
    >
      <div
        className="radio-progress-fill absolute inset-y-0 left-0"
        style={{
          width: `${progress.fraction * 100}%`,
          background: "var(--radio-air)",
          boxShadow: "0 0 10px rgb(63 169 138 / 0.7)",
        }}
      />
    </div>
  )
}

// Elapsed and remaining, in the tabular mono the whole deck uses for numbers.
export function ProgressClock({ progress }: { progress: Progress }) {
  return (
    <div
      className="radio-mono flex justify-between pt-2 text-[11px]"
      style={{ color: "var(--radio-ink-55)" }}
    >
      <span>{mmss(progress.elapsedS)}</span>
      <span>−{mmss(progress.remainingS)}</span>
    </div>
  )
}
