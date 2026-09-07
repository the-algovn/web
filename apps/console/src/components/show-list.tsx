import { Button } from "@algovn/ui/button"
import { ChevronDown, ChevronUp, SkipForward, X } from "lucide-react"
import type { ReactNode } from "react"
import { GATE_LABEL, PAST_PAGE_SIZE, type Segment, type Timeline } from "../lib/show-timeline"
import { SegmentRow } from "./segment-row"
import { StagingStrip } from "./staging-strip"

function Section(props: { label: string; children: ReactNode }) {
  return (
    <section aria-label={props.label}>
      <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
        {props.label}
      </div>
      {props.children}
    </section>
  )
}

// An empty running order has several causes and the break gate is the only one
// the server actually reports. Naming "off air" without it would assert a fact
// about the station that this view never checked.
function emptyOrder(breakGate: string): string {
  if (breakGate === "off_air") return "No running order - the station is off air."
  return "No running order to show."
}

// Removal is irreversible on a live station and the X sits beside two
// same-sized chevrons, so it is guarded the way the queue pane guarded it.
function confirmRemove(seg: Segment, onRemove: (requestId: string) => void) {
  if (window.confirm(`Gỡ "${seg.title}" khỏi hàng đợi?`)) onRemove(seg.requestId)
}

export function ShowList(props: {
  timeline: Timeline
  nowMs: number
  selectedId: string | null
  onSelect(id: string | null): void
  busy: boolean
  page: number
  onPage(p: number): void
  onSkip(): void
  // The id list the server compares against lives behind /station/requests,
  // not in this projection, so the row only names the request and a direction
  // and the hook builds the submission. See useShowTimeline.move.
  onMove(requestId: string, delta: number): void
  onRemove(requestId: string): void
  renderDetail?(seg: Segment): ReactNode
}) {
  const { timeline: tl, nowMs } = props
  const toggle = (id: string) => props.onSelect(props.selectedId === id ? null : id)
  const detail = (s: Segment) => (props.renderDetail ? props.renderDetail(s) : null)

  const pageCount = Math.max(1, Math.ceil(tl.totalPast / PAST_PAGE_SIZE))

  return (
    <div className="flex flex-col gap-4">
      <StagingStrip items={tl.staging} />

      {tl.breakGate && tl.breakGate !== "ok" ? (
        <div className="text-muted-foreground border-border rounded-lg border px-3 py-2 text-xs">
          {GATE_LABEL[tl.breakGate] ?? tl.breakGate}
        </div>
      ) : null}

      <Section label="On air">
        {tl.airing ? (
          <ul>
            <SegmentRow
              seg={tl.airing}
              nowMs={nowMs}
              expanded={props.selectedId === tl.airing.id}
              onToggle={() => tl.airing && toggle(tl.airing.id)}
              detail={detail(tl.airing)}
              actions={
                <Button variant="outline" size="sm" disabled={props.busy} onClick={props.onSkip}>
                  <SkipForward /> Skip
                </Button>
              }
            />
          </ul>
        ) : (
          <p className="text-muted-foreground py-2 text-sm">Nothing on air.</p>
        )}
      </Section>

      <Section label="Coming up">
        {tl.upcoming.length > 0 ? (
          <ul>
            {tl.upcoming.map((s) => (
              <SegmentRow
                key={s.id}
                seg={s}
                nowMs={nowMs}
                expanded={props.selectedId === s.id}
                onToggle={() => toggle(s.id)}
                detail={detail(s)}
                actions={
                  s.requestId ? (
                    <>
                      <Button variant="ghost" size="sm" aria-label={`Move ${s.title} earlier`} disabled={props.busy} onClick={() => props.onMove(s.requestId, -1)}>
                        <ChevronUp />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Move ${s.title} later`} disabled={props.busy} onClick={() => props.onMove(s.requestId, 1)}>
                        <ChevronDown />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Remove ${s.title}`} disabled={props.busy} onClick={() => confirmRemove(s, props.onRemove)}>
                        <X />
                      </Button>
                    </>
                  ) : null
                }
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-2 text-sm">{emptyOrder(tl.breakGate)}</p>
        )}
      </Section>

      <Section label="Already aired">
        <ul>
          {tl.past.map((s) => (
            <SegmentRow
              key={s.id}
              seg={s}
              nowMs={nowMs}
              expanded={props.selectedId === s.id}
              onToggle={() => toggle(s.id)}
              detail={detail(s)}
            />
          ))}
        </ul>
      </Section>
      <nav aria-label="Past pagination" className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={props.page >= pageCount - 1} onClick={() => props.onPage(props.page + 1)}>
          Older
        </Button>
        <Button variant="outline" size="sm" disabled={props.page === 0} onClick={() => props.onPage(props.page - 1)}>
          Newer
        </Button>
        <span>
          page {props.page + 1} / {pageCount} of {tl.totalPast}
        </span>
      </nav>
    </div>
  )
}
