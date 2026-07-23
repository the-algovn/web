import { Loader2, Pause, Play, VolumeX } from "lucide-react"
import { useState } from "react"
import type { PlayerState } from "../lib/player"

export function PlayerControls({
  playerState,
  volumeControllable,
  onPlay,
  onPause,
  onVolume,
  onMute,
}: {
  playerState: PlayerState
  volumeControllable: boolean
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
  onMute(muted: boolean): void
}) {
  const [muted, setMuted] = useState(false)
  const playing = playerState === "playing"
  const busy = playerState === "connecting" || playerState === "stalled"
  const label = busy ? "Đang kết nối" : playing ? "Tạm dừng" : "Phát"

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={playing ? onPause : onPlay}
        className="grid size-12 shrink-0 place-items-center rounded-full text-[color:var(--background)] transition active:scale-95 disabled:opacity-70"
        style={{
          background: "var(--radio-amber)",
          boxShadow:
            "0 4px 16px color-mix(in srgb, var(--radio-amber) 35%, transparent)",
        }}
      >
        {busy ? (
          <Loader2 aria-hidden className="size-5 animate-spin" />
        ) : playing ? (
          <Pause aria-hidden className="size-5" />
        ) : (
          <Play aria-hidden className="size-5" />
        )}
      </button>

      {volumeControllable ? (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.8}
          aria-label="Âm lượng"
          onChange={(e) => onVolume(Number(e.currentTarget.value))}
          className="min-w-0 flex-1 accent-[color:var(--radio-amber)]"
        />
      ) : (
        // iOS ignores volume writes, so a slider there is a dead control.
        // A mute toggle is the one thing that still works.
        <button
          type="button"
          aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
          onClick={() => {
            const next = !muted
            setMuted(next)
            onMute(next)
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-[color:var(--border)] text-[color:var(--muted-foreground)]"
        >
          <VolumeX aria-hidden className="size-4" />
        </button>
      )}
    </div>
  )
}
