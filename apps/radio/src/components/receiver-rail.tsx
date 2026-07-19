import { Users } from "lucide-react"
import { FrequencyDial } from "./frequency-dial"
import { OnAirLamp } from "./on-air-lamp"
import { Transport } from "./transport"
import type { PlayerState } from "../lib/player"
import type { StationStatus } from "../lib/station-state"

export function ReceiverRail(props: {
  status: StationStatus
  listeners: number
  playerState: PlayerState
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
}) {
  return (
    <aside className="flex flex-col items-center gap-4 md:border-r md:border-[color:var(--border)] md:pr-6">
      <div className="text-center">
        <div className="font-mono text-base font-bold">Tần Số <span style={{ color: "var(--radio-amber)" }}>42</span></div>
        <div className="text-xs text-[color:var(--muted-foreground)]">Tiểu Dương Dương</div>
      </div>
      <FrequencyDial />
      <OnAirLamp status={props.status} />
      <Transport playerState={props.playerState} onPlay={props.onPlay} onPause={props.onPause} onVolume={props.onVolume} />
      <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <Users className="size-3.5" /> {props.listeners} listening
      </div>
    </aside>
  )
}
