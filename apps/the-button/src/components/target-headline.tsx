import { TARGET } from "../lib/progress"

export function TargetHeadline() {
  return (
    <div className="tb-box w-full max-w-3xl p-5 text-left">
      <div className="text-muted-foreground font-mono text-[0.7rem] tracking-[0.1em]">TARGET</div>
      <div className="text-primary font-mono text-xl font-bold tabular-nums break-all sm:text-2xl">
        {TARGET.toLocaleString("en-US")}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">one quadrillion clicks</div>
    </div>
  )
}
