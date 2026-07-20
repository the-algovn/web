import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { RadioTower } from "lucide-react"
import type { Station } from "../lib/radio"

// Operator mirror of /radio's on-air lamp: state, active playlist, toggle.
export function StationBar(props: {
  station: Station | null
  busy: boolean
  onGoOnAir: () => void
  onGoOffAir: () => void
}) {
  const st = props.station ?? {}
  const onAir = st.onAir === true
  const canGoOnAir = Boolean(st.activePlaylistId) && (st.activeTrackCount ?? 0) > 0
  return (
    <div className="flex items-center gap-3 border-b px-6 py-3">
      <RadioTower className="text-muted-foreground size-4" />
      {onAir ? (
        <Badge className="animate-pulse bg-red-600 text-white">ON AIR</Badge>
      ) : (
        <Badge variant="outline">OFF AIR</Badge>
      )}
      <span className="text-sm">
        {st.activePlaylistName ? (
          <>
            <span className="text-muted-foreground">active:</span> {st.activePlaylistName}
          </>
        ) : (
          <span className="text-muted-foreground">No active playlist</span>
        )}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {!onAir && !canGoOnAir ? (
          <span className="text-muted-foreground text-xs">
            Set a non-empty active playlist first.
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
