import { Pause, Play, Loader2 } from "lucide-react"
import type { PlayerState } from "../lib/player"

export function Transport({
  playerState, onPlay, onPause, onVolume,
}: {
  playerState: PlayerState
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
}) {
  const playing = playerState === "playing"
  const busy = playerState === "connecting" || playerState === "stalled"
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={playing ? onPause : onPlay}
        className="grid size-14 place-items-center rounded-full text-[color:var(--background)] transition active:scale-95"
        style={{ background: "var(--radio-amber)", boxShadow: "0 4px 14px color-mix(in srgb, var(--radio-amber) 35%, transparent)" }}
      >
        {busy ? <Loader2 className="size-6 animate-spin" /> : playing ? <Pause className="size-6" /> : <Play className="size-6" />}
      </button>
      <input
        type="range" min={0} max={1} step={0.01} defaultValue={0.8}
        aria-label="Volume"
        onChange={e => onVolume(Number(e.currentTarget.value))}
        className="w-full accent-[color:var(--radio-amber)]"
      />
    </div>
  )
}
