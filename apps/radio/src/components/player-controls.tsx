import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"
import type { PlayerState } from "../lib/player"

// The mockup draws no transport at all - it assumes a stream that is simply
// on. A radio you cannot pause is a worse radio, so the controls stay; they
// are restyled to the deck's square, mono vocabulary instead of dropped.
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
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={playing ? onPause : onPlay}
        className="grid size-11 shrink-0 place-items-center transition active:scale-95 disabled:opacity-70"
        style={{
          background: "var(--radio-air)",
          color: "var(--radio-deep)",
          boxShadow: "0 0 14px rgb(63 169 138 / 0.35)",
        }}
      >
        {busy ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : playing ? (
          <Pause aria-hidden className="size-4" />
        ) : (
          <Play aria-hidden className="size-4" />
        )}
      </button>

      {volumeControllable ? (
        <>
          <Volume2
            aria-hidden
            className="size-4 shrink-0"
            style={{ color: "var(--radio-ink-55)" }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.8}
            aria-label="Âm lượng"
            onChange={(e) => onVolume(Number(e.currentTarget.value))}
            className="min-w-0 flex-1 accent-[color:var(--radio-air)]"
          />
        </>
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
          className="grid size-11 shrink-0 place-items-center border"
          style={{
            borderColor: "var(--radio-line-firm)",
            color: muted ? "var(--radio-air)" : "var(--radio-ink-55)",
          }}
        >
          {muted ? (
            <VolumeX aria-hidden className="size-4" />
          ) : (
            <Volume2 aria-hidden className="size-4" />
          )}
        </button>
      )}
    </div>
  )
}
