import type { ConnMode } from "../lib/radio-client"
import type { StationStatus } from "../lib/station-state"
import { ConnectionBadge } from "./connection-badge"
import { ListenerCount } from "./listener-count"
import { OnAirLamp } from "./on-air-lamp"

export function StationHeader({
  status,
  mode,
  listeners,
}: {
  status: StationStatus
  mode: ConnMode
  listeners: number
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
      <div className="min-w-0">
        <div className="font-mono text-sm font-bold">
          Tần Số <span style={{ color: "var(--radio-amber)" }}>42</span>
        </div>
        <div className="truncate text-[11px] text-[color:var(--muted-foreground)]">
          Tiểu Dương Dương
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ConnectionBadge mode={mode} />
        <OnAirLamp status={status} />
        <ListenerCount count={listeners} />
      </div>
    </header>
  )
}
