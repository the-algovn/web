import {
  CERTAINTY_LABEL,
  hhmm,
  isFact,
  KIND_DJ,
  KIND_STATION_ID,
  KIND_UNKNOWN,
  layout,
  playheadPct,
  type Segment,
  type Timeline,
} from "../lib/show-timeline"

// Colour carries kind; opacity and the dotted top carry certainty. Past is
// opaque, future is lighter and dotted, because it is a projection.
function blockClass(seg: Segment): string {
  const base =
    seg.kind === KIND_DJ
      ? "bg-amber-500"
      : seg.kind === KIND_STATION_ID
        ? "bg-violet-500"
        : seg.kind === KIND_UNKNOWN
          ? "bg-muted-foreground/30"
          : "bg-primary"
  return isFact(seg.certainty) ? base : `${base} opacity-50 border-t-2 border-dotted border-t-current`
}

function blockLabel(seg: Segment): string {
  const name =
    seg.title ||
    (seg.kind === KIND_DJ ? "DJ break" : seg.kind === KIND_STATION_ID ? "Station ID" : "Shuffle")
  return `${name} ${hhmm(seg.startedAtMs)} ${CERTAINTY_LABEL[seg.certainty] ?? seg.certainty}`
}

export function ShowRibbon(props: {
  timeline: Timeline
  nowMs: number
  selectedId: string | null
  onSelect(id: string): void
}) {
  const { timeline: tl, nowMs } = props
  const segs: Segment[] = [...tl.past, ...(tl.airing ? [tl.airing] : []), ...tl.upcoming]
  const blocks = layout(segs, nowMs)

  return (
    <div className="flex flex-col gap-1">
      <div className="bg-muted/40 relative h-12 w-full overflow-hidden rounded-md">
        {blocks.map((b) => (
          <button
            key={b.seg.id}
            type="button"
            aria-label={blockLabel(b.seg)}
            aria-pressed={props.selectedId === b.seg.id}
            onClick={() => props.onSelect(b.seg.id)}
            style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
            className={`absolute top-0 h-full overflow-hidden rounded-sm px-1 text-left text-[10px] text-white ${blockClass(b.seg)} ${
              props.selectedId === b.seg.id ? "ring-ring ring-2" : ""
            }`}
          >
            <span className="truncate">{b.seg.title}</span>
          </button>
        ))}
        <div
          data-testid="playhead"
          style={{ left: `${playheadPct()}%` }}
          className="absolute top-0 h-full w-0.5 bg-green-500"
        />
      </div>
      <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
        <span>{hhmm(nowMs - 20 * 60_000)}</span>
        <span>now</span>
        <span>{hhmm(nowMs + 30 * 60_000)}</span>
      </div>
      <div className="text-muted-foreground flex gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="bg-primary inline-block size-2 rounded-sm" /> track</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-500" /> DJ</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-violet-500" /> station ID</span>
        <span className="flex items-center gap-1"><span className="bg-muted-foreground/30 inline-block size-2 rounded-sm" /> shuffle</span>
        <span>dotted = projected</span>
      </div>
    </div>
  )
}
