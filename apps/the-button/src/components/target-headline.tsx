import { TARGET } from "../lib/progress"

export function TargetHeadline() {
  return (
    <div className="border-border bg-card w-full max-w-3xl rounded-md border p-4 text-left">
      <div className="text-muted-foreground font-mono text-xs tracking-widest">TARGET</div>
      <div className="text-primary font-mono text-xl font-semibold tabular-nums break-all sm:text-2xl">
        {TARGET.toLocaleString("en-US")}
      </div>
      <div className="text-muted-foreground text-xs">one quadrillion clicks</div>
    </div>
  )
}
