import { Button } from "@algovn/ui/button"
import { Slider } from "@algovn/ui/slider"
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react"
import { formatClock, type Track } from "../lib/media"
import type { PlayerStatus } from "../lib/use-player"

export function TransportBar(props: {
  track: Track | null
  status: PlayerStatus
  currentTime: number
  duration: number
  volume: number
  canPrev: boolean
  canNext: boolean
  onToggle: () => void
  onSeek: (t: number) => void
  onVolume: (v: number) => void
  onPrev: () => void
  onNext: () => void
}) {
  const playing = props.status === "playing"
  return (
    <div
      data-testid="transport-bar"
      className="border-border flex items-center gap-4 border-t px-6 py-3"
    >
      {props.track ? (
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous"
              disabled={!props.canPrev}
              onClick={props.onPrev}
            >
              <SkipBack />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={playing ? "Pause" : "Play"}
              onClick={props.onToggle}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next"
              disabled={!props.canNext}
              onClick={props.onNext}
            >
              <SkipForward />
            </Button>
          </div>
          <div className="min-w-40 max-w-72 truncate text-sm">
            <span className="font-medium">{props.track.title}</span>
            {props.track.channel ? (
              <span className="text-muted-foreground"> · {props.track.channel}</span>
            ) : null}
          </div>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatClock(props.currentTime)}
          </span>
          <Slider
            aria-label="Seek"
            className="flex-1"
            min={0}
            max={props.duration || 0}
            step={1}
            value={[props.currentTime]}
            onValueChange={([v]) => props.onSeek(v ?? 0)}
          />
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatClock(props.duration)}
          </span>
          <Volume2 className="text-muted-foreground size-4 shrink-0" />
          <Slider
            aria-label="Volume"
            className="w-24"
            min={0}
            max={1}
            step={0.01}
            value={[props.volume]}
            onValueChange={([v]) => props.onVolume(v ?? 0)}
          />
        </>
      ) : (
        <span className="text-muted-foreground text-sm">Nothing playing</span>
      )}
    </div>
  )
}
