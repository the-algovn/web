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
      className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--border)]"
    >
      <div
        className="radio-progress-fill h-full rounded-full"
        style={{
          width: `${progress.fraction * 100}%`,
          background: "var(--radio-amber)",
          boxShadow:
            "0 0 8px color-mix(in srgb, var(--radio-amber) 50%, transparent)",
        }}
      />
    </div>
  )
}
