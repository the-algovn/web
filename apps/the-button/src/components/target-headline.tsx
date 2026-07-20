import { TARGET } from "../lib/progress"
import { avgClicksPerSession } from "../lib/sessions"
import { Section } from "./section"

// The target panel: goal, ETA and the session stats folded into one block so
// "where we are vs where we're going" reads as a single section.
export function TargetHeadline({
  total,
  users,
  eta,
}: {
  total: number | null
  users: number | null
  eta?: string
}) {
  const avg = avgClicksPerSession(total, users)
  return (
    <Section label="target" title="// target">
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
      <div className="border-border mt-4 flex items-center justify-around gap-4 border-t pt-3 text-center">
        <Stat
          label="TOTAL_SESSIONS"
          value={users === null ? "—" : users.toLocaleString("en-US")}
        />
        <div className="bg-border h-8 w-px" aria-hidden />
        <Stat
          label="AVG_CLICKS/SESSION"
          value={avg === null ? "—" : avg.toFixed(1)}
        />
      </div>
    </Section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground font-mono text-[0.65rem] tracking-widest">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  )
}
