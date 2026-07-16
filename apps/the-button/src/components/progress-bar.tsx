import { progress } from "../lib/progress"

export function ProgressBar({ total }: { total: number | null }) {
  const p = total === null ? { percent: 0, label: "next: —" } : progress(total)
  const pctText = p.percent < 1 ? p.percent.toFixed(4) : p.percent.toFixed(1)
  return (
    <div className="tb-box w-full max-w-3xl p-4 text-left">
      <div className="text-muted-foreground mb-3 flex items-center justify-between font-mono text-xs tracking-wider">
        <span>PROGRESS</span>
        <span className="tabular-nums">{pctText}%</span>
      </div>
      <div className="bg-border h-1 w-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={Math.round(p.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-primary h-full transition-[width] duration-500 [box-shadow:0_0_10px_var(--primary)]"
          style={{ width: `${p.percent}%` }}
        />
      </div>
    </div>
  )
}
