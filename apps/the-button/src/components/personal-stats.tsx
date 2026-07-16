import type { ReactNode } from "react"
import { Badge } from "@algovn/ui/badge"
import { impact } from "../lib/sessions"

export function PersonalStats({
  myTotal,
  pending,
  total,
}: {
  myTotal: number | null
  pending: number
  total: number | null
}) {
  const share = impact(myTotal, total)
  return (
    <div className="tb-box border-l-primary flex w-full max-w-3xl items-center justify-around gap-4 border-l-[3px] p-4 text-center">
      <Stat label="YOUR_CLICKS">
        <span className="font-mono tabular-nums">
          {myTotal === null ? "—" : (myTotal + pending).toLocaleString("en-US")}
        </span>
        {pending > 0 && (
          <Badge variant="secondary" className="ml-2">
            {pending.toLocaleString("en-US")} pending
          </Badge>
        )}
      </Stat>
      <div className="bg-border h-8 w-px" aria-hidden />
      <Stat label="YOUR_IMPACT">
        <span className="font-mono tabular-nums">{share === null ? "—" : `${share.toFixed(2)}%`}</span>
      </Stat>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground font-mono text-[0.65rem] tracking-widest">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}
