import { Badge } from "@algovn/ui/badge"
import { Mic, Music2, RadioTower, Shuffle } from "lucide-react"
import type { ReactNode } from "react"
import {
  CERTAINTY_LABEL,
  fmtDuration,
  hhmm,
  isFact,
  KIND_DJ,
  KIND_STATION_ID,
  KIND_UNKNOWN,
  label,
  type Segment,
} from "../lib/show-timeline"

// Badge weight tracks the ladder: facts are solid, projections are outlined.
// prepared is deliberately NOT solid - a prepared clip can still evaporate at
// Take, so only aired and airing get to look certain.
const CERTAINTY_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  aired: "secondary",
  airing: "default",
  committed: "outline",
  prepared: "outline",
  projected: "outline",
  due: "outline",
  unknown: "outline",
  staging: "outline",
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === KIND_DJ) return <Mic className="size-3.5 shrink-0 text-amber-600" />
  if (kind === KIND_STATION_ID) return <RadioTower className="size-3.5 shrink-0 text-violet-600" />
  if (kind === KIND_UNKNOWN) return <Shuffle className="text-muted-foreground size-3.5 shrink-0" />
  return <Music2 className="text-muted-foreground size-3.5 shrink-0" />
}

function attribution(seg: Segment): string | null {
  if (seg.source === "ai") {
    return seg.reason ? `Tiểu Dương Dương chọn: ${seg.reason}` : "Tiểu Dương Dương chọn"
  }
  if (seg.source === "listener") {
    return `Yêu cầu của ${seg.requestedByName || "thính giả"}`
  }
  return null
}

export function SegmentRow(props: {
  seg: Segment
  nowMs: number
  expanded: boolean
  onToggle(): void
  actions?: ReactNode
  detail?: ReactNode
}) {
  const { seg, nowMs, expanded } = props
  const attr = attribution(seg)
  const airing = seg.certainty === "airing"
  const pct =
    airing && seg.durationMs > 0
      ? Math.min(100, Math.max(0, Math.round(((nowMs - seg.startedAtMs) / seg.durationMs) * 100)))
      : 0

  return (
    <li
      data-certainty={seg.certainty}
      data-kind={seg.kind}
      className="border-border/60 flex flex-col gap-1 border-b py-2 last:border-b-0"
    >
      <div className="flex items-center gap-2">
        <span data-testid="segment-time" className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
          {isFact(seg.certainty) ? "" : "~"}
          {hhmm(seg.startedAtMs)}
        </span>
        <KindIcon kind={seg.kind} />
        <button
          type="button"
          onClick={props.onToggle}
          aria-expanded={props.expanded}
          className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
        >
          <span className={seg.title ? "" : "text-muted-foreground italic"}>{label(seg)}</span>
          {seg.artist ? <span className="text-muted-foreground"> - {seg.artist}</span> : null}
        </button>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">{fmtDuration(seg.durationMs)}</span>
        <Badge variant={CERTAINTY_VARIANT[seg.certainty] ?? "outline"} className="shrink-0">
          {CERTAINTY_LABEL[seg.certainty] ?? seg.certainty}
        </Badge>
        {seg.status ? <Badge variant="outline" className="shrink-0">{seg.status}</Badge> : null}
        {props.actions ? <span className="flex shrink-0 items-center gap-1">{props.actions}</span> : null}
      </div>

      {attr ? <div className="text-muted-foreground pl-16 text-xs italic">{attr}</div> : null}

      {airing ? (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label(seg)} progress`}
          className="bg-muted ml-16 h-1 overflow-hidden rounded-full"
        >
          <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {expanded ? (
        <div className="flex flex-col gap-2 pl-16 pt-1">
          {seg.script ? (
            <pre className="bg-muted max-h-48 overflow-auto whitespace-pre-wrap rounded p-2 font-mono text-xs">
              {seg.script}
            </pre>
          ) : null}
          {seg.backsellTitle || seg.promiseTitle ? (
            <div className="text-muted-foreground text-xs">
              {seg.backsellTitle ? <>vừa phát: {seg.backsellTitle} </> : null}
              {seg.promiseTitle ? <>sắp phát: {seg.promiseTitle}</> : null}
            </div>
          ) : null}
          {seg.model ? (
            <div className="text-muted-foreground font-mono text-xs">
              {seg.model} - {seg.inTokens}/{seg.outTokens} tok - ${seg.costUsd.toFixed(4)} - {seg.latencyMs}ms
            </div>
          ) : null}
          {props.detail}
        </div>
      ) : null}
    </li>
  )
}
