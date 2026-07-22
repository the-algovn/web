import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { Bot, RadioTower, Users } from "lucide-react"
import type { Station, StationStats } from "../lib/radio"

// The operator's master row: on-air toggle (gated only on a non-empty
// library — v1.2 killed the playlist concept), listeners, spend, AI pause.
export function StationBar(props: {
  station: Station | null
  stats: StationStats | null
  busy: boolean
  onGoOnAir(): void
  onGoOffAir(): void
  onToggleAI(enabled: boolean): void
}) {
  const st = props.station ?? {}
  const stats = props.stats ?? {}
  const onAir = st.onAir === true
  const aiOn = st.aiEnabled === true
  const canGoOnAir = (stats.libraryCount ?? 0) > 0
  const spend = `$${(stats.spendTodayUsd ?? 0).toFixed(2)} / $${(stats.budgetUsd ?? 0).toFixed(2)}`
  return (
    <div className="flex items-center gap-3 border-b px-6 py-3">
      <RadioTower className="text-muted-foreground size-4" />
      {onAir ? (
        <Badge className="animate-pulse bg-red-600 text-white">ON AIR</Badge>
      ) : (
        <Badge variant="outline">OFF AIR</Badge>
      )}
      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Users className="size-3.5" /> {stats.listeners ?? 0} listening
      </span>
      <span className="text-muted-foreground text-sm">{spend}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={aiOn ? "outline" : "secondary"}
          size="sm"
          disabled={props.busy}
          onClick={() => props.onToggleAI(!aiOn)}
        >
          <Bot /> {aiOn ? "Tiểu Dương Dương: on" : "Tiểu Dương Dương: paused"}
        </Button>
        {!onAir && !canGoOnAir ? (
          <span className="text-muted-foreground text-xs">
            Library is empty — ingest tracks first.
          </span>
        ) : null}
        {onAir ? (
          <Button variant="destructive" size="sm" disabled={props.busy} onClick={props.onGoOffAir}>
            Go off air
          </Button>
        ) : (
          <Button size="sm" disabled={props.busy || !canGoOnAir} onClick={props.onGoOnAir}>
            Go on air
          </Button>
        )}
      </div>
    </div>
  )
}
