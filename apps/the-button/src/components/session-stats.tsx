import { avgClicksPerSession } from "../lib/sessions"

export function SessionStats({
  total,
  users,
}: {
  total: number | null
  users: number | null
}) {
  const avg = avgClicksPerSession(total, users)
  return (
    <div className="tb-box border-l-primary flex w-full max-w-3xl items-center justify-around gap-4 border-l-[3px] p-4 text-center">
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
