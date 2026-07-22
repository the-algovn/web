import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { ArrowDown, ArrowUp, ListMusic, Trash2 } from "lucide-react"
import { useRef } from "react"
import type { TrackRequest } from "../lib/radio"

function badgeText(r: TrackRequest): string {
  if (r.source === "listener") return `Yêu cầu · ${r.requestedByName ?? "thính giả"}`
  return "Tiểu Dương Dương chọn"
}

// Pending requests in air order; drag or arrow-reorder submits the WHOLE id
// list (the server rejects stale sets — the hook resyncs on that error).
export function QueuePane(props: {
  pending: TrackRequest[]
  busy: boolean
  onReorder(ids: string[]): void
  onRemove(id: string): void
}) {
  const dragFrom = useRef<number | null>(null)
  const ids = props.pending.map((r) => r.id ?? "")

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length || from === to) return
    const next = [...ids]
    const [x] = next.splice(from, 1) as [string]
    next.splice(to, 0, x)
    props.onReorder(next)
  }

  if (props.pending.length === 0) {
    return (
      <EmptyState
        icon={<ListMusic />}
        title="Queue is empty — the shuffle bed is playing."
        description="Listener requests and AI picks appear here in air order."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {props.pending.map((r, i) => (
        <li
          key={r.id}
          draggable
          onDragStart={() => {
            dragFrom.current = i
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom.current !== null) move(dragFrom.current, i)
            dragFrom.current = null
          }}
          onDragEnd={() => {
            dragFrom.current = null
          }}
          className="flex items-center gap-2 rounded-md border px-2 py-1.5"
        >
          <span className="text-muted-foreground w-5 text-right text-xs">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm">{r.title}</span>
              <Badge variant="outline">{r.status === "ready" ? "sẵn sàng" : "đang tải"}</Badge>
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {/* separate spans so tests can exact-match each text */}
              <span>{badgeText(r)}</span>
              {r.source === "ai" && r.reason ? <span className="italic"> — {r.reason}</span> : null}
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Move up ${r.title ?? ""}`} disabled={props.busy || i === 0} onClick={() => move(i, i - 1)}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Move down ${r.title ?? ""}`} disabled={props.busy || i === props.pending.length - 1} onClick={() => move(i, i + 1)}>
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${r.title ?? ""}`}
            disabled={props.busy}
            onClick={() => {
              if (window.confirm(`Gỡ "${r.title ?? ""}" khỏi hàng đợi?`)) props.onRemove(r.id ?? "")
            }}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}
