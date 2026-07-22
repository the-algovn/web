import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Music2, SkipForward } from "lucide-react"
import { useEffect, useState } from "react"
import type { NowPlayingWire } from "../lib/radio"

function attribution(np: NowPlayingWire): string | null {
  if (np.source === "ai") {
    return np.reason ? `Tiểu Dương Dương chọn: ${np.reason}` : "Tiểu Dương Dương chọn"
  }
  if (np.source === "listener") return `Yêu cầu của ${np.requestedByName ?? "thính giả"}`
  return null
}

// The airing track with a client-clock progress bar and the Skip control.
export function NowPlayingCard(props: {
  np: NowPlayingWire | null
  busy: boolean
  onSkip(): void
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const np = props.np
  if (!np) {
    return <EmptyState icon={<Music2 />} title="Nothing airing." description="Shuffle starts when you go on air." />
  }
  const started = np.startedAt ? new Date(np.startedAt).getTime() : nowMs
  const dur = (np.durationSeconds ?? 0) * 1000
  const pct = dur > 0 ? Math.min(100, Math.max(0, ((nowMs - started) / dur) * 100)) : 0
  const attr = attribution(np)
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{np.title}</div>
          {np.artist ? <div className="text-muted-foreground truncate text-sm">{np.artist}</div> : null}
          {attr ? <div className="text-muted-foreground mt-1 text-xs italic">{attr}</div> : null}
        </div>
        <Button variant="outline" size="sm" disabled={props.busy} onClick={props.onSkip}>
          <SkipForward /> Skip
        </Button>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
