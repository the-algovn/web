import {
  CERTAINTY_LABEL,
  hhmm,
  isFact,
  KIND_DJ,
  KIND_STATION_ID,
  KIND_UNKNOWN,
  label,
  layout,
  playheadPct,
  type Segment,
  type Timeline,
  WINDOW_AFTER_MS,
  WINDOW_BEFORE_MS,
} from "../lib/show-timeline"

// Colour carries kind; border style and opacity carry certainty. Facts are
// opaque and unbordered; every projection is lighter, and how much lighter
// tracks the ladder. Grading them apart is the point: a prepared clip is
// rendered and paid for and will almost certainly air, while a due break is a
// cadence guess that may never exist, so they must not look the same.
//
// Borders rather than rings, because the selected block already owns the ring
// and two ring colours on one element resolve arbitrarily. prepared is set
// apart by a marker rather than a border: an outline in the block's own text
// colour would be indistinguishable from committed's. Its opacity still has to
// be below full - a prepared clip can evaporate at Take, and at the inherited
// default it would compute identically to an aired block of the same kind.
const CERTAINTY_CLASS: Record<string, string> = {
  committed: "opacity-90 border-2 border-solid border-current",
  prepared: "opacity-75",
  projected: "opacity-50 border-t-2 border-dotted border-t-current",
  due: "opacity-30 border-2 border-dashed border-current",
}
const PROJECTION_CLASS = "opacity-50 border-t-2 border-dotted border-t-current"

function blockClass(seg: Segment): string {
  const base =
    seg.kind === KIND_DJ
      ? "bg-amber-500"
      : seg.kind === KIND_STATION_ID
        ? "bg-violet-500"
        : seg.kind === KIND_UNKNOWN
          ? "bg-muted-foreground/30"
          : "bg-primary"
  if (isFact(seg.certainty)) return base
  return `${base} ${CERTAINTY_CLASS[seg.certainty] ?? PROJECTION_CLASS}`
}

function blockLabel(seg: Segment): string {
  return `${label(seg)} ${hhmm(seg.startedAtMs)} ${CERTAINTY_LABEL[seg.certainty] ?? seg.certainty}`
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
            {b.seg.certainty === "prepared" ? (
              <span
                data-testid="prepared-marker"
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 size-1.5 rotate-45 bg-white"
              />
            ) : null}
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
        <span>{hhmm(nowMs - WINDOW_BEFORE_MS)}</span>
        <span>now</span>
        <span>{hhmm(nowMs + WINDOW_AFTER_MS)}</span>
      </div>
      <div className="text-muted-foreground flex gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="bg-primary inline-block size-2 rounded-sm" /> track</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-500" /> DJ</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-violet-500" /> station ID</span>
        <span className="flex items-center gap-1"><span className="bg-muted-foreground/30 inline-block size-2 rounded-sm" /> shuffle</span>
        <span>faded = projected</span>
        <span>dashed = có thể có</span>
      </div>
    </div>
  )
}
