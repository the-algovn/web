import { TARGET } from "../lib/progress"

// `eta` (optional) folds the time-to-target readout into the same box as the
// goal, so target and ETA read as one block.
export function TargetHeadline({ eta }: { eta?: string }) {
  return (
    <div className="tb-box w-full max-w-3xl p-5 text-left">
      <div className="text-muted-foreground font-mono text-[0.7rem] tracking-[0.1em]">
        TARGET
      </div>
      <div className="text-primary font-mono text-xl font-bold tabular-nums break-all sm:text-2xl">
        {TARGET.toLocaleString("en-US")}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        one quadrillion clicks
      </div>
      {eta && (
        <div className="border-border mt-4 flex items-baseline gap-2 border-t pt-3 font-mono text-xs">
          <span className="text-muted-foreground tracking-[0.1em]">ETA</span>
          <span className="text-primary font-bold text-balance">{eta}</span>
        </div>
      )}
    </div>
  )
}
