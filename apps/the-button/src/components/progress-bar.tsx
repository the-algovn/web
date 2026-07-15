import { progress } from "../lib/progress"

export function ProgressBar({ total }: { total: number | null }) {
  const p = total === null ? { percent: 0, label: "next: —" } : progress(total)
  const pctText = p.percent < 1 ? p.percent.toFixed(4) : p.percent.toFixed(1)
  return (
    <div className="w-full max-w-3xl text-left">
      <div className="text-muted-foreground mb-2 flex items-center justify-between font-mono text-xs">
        <span>{p.label}</span>
        <span className="tabular-nums">{pctText}%</span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          role="progressbar"
          aria-valuenow={Math.round(p.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-primary h-full rounded-full transition-[width] duration-500"
          style={{ width: `${p.percent}%` }}
        />
      </div>
    </div>
  )
}
