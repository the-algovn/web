import { Users } from "lucide-react"
import type { PlayerState } from "../lib/player"
import type { StationStatus } from "../lib/station-state"
import { FrequencyDial } from "./frequency-dial"
import { OnAirLamp } from "./on-air-lamp"
import { Transport } from "./transport"

export function ReceiverRail(props: {
  status: StationStatus
  listeners: number
  playerState: PlayerState
  signedIn: boolean
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
  onSignIn(): void
  onRequest(): void
}) {
  return (
    <aside className="flex flex-col items-center gap-4 md:border-r md:border-[color:var(--border)] md:pr-6">
      <div className="text-center">
        <div className="font-mono text-base font-bold">
          Tần Số <span style={{ color: "var(--radio-amber)" }}>42</span>
        </div>
        <div className="text-xs text-[color:var(--muted-foreground)]">
          Tiểu Dương Dương
        </div>
      </div>
      <FrequencyDial />
      <OnAirLamp status={props.status} />
      <Transport
        playerState={props.playerState}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onVolume={props.onVolume}
      />
      <button
        type="button"
        onClick={props.signedIn ? props.onRequest : props.onSignIn}
        className="w-full rounded-md border px-3 py-2 text-xs font-medium transition active:scale-95"
        style={{
          borderColor: "var(--radio-amber)",
          color: "var(--radio-amber-soft)",
          background: "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
        }}
      >
        {props.signedIn ? "Yêu cầu bài hát" : "Đăng nhập để yêu cầu"}
      </button>
      <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <Users className="size-3.5" /> {props.listeners} listening
      </div>
    </aside>
  )
}
