import { Badge } from "@algovn/ui/badge"
import type { HistoryWireItem, TrackRequest } from "../lib/radio"

function sourceBadge(source?: string, name?: string): string | null {
  if (source === "listener") return `Yêu cầu · ${name ?? "thính giả"}`
  if (source === "ai") return "Tiểu Dương Dương chọn"
  return null
}

// Recent terminal requests (aired/failed) and recent plays (incl. shuffle).
export function RecentPane(props: { recent: TrackRequest[]; history: HistoryWireItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {props.recent.length > 0 ? (
        <section aria-label="Recent requests">
          <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Recent requests</div>
          <ul className="flex flex-col gap-1">
            {props.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="truncate">{r.title}</span>
                <Badge variant={r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge>
                {r.status === "failed" && r.failReason ? (
                  <span className="text-muted-foreground truncate text-xs">{r.failReason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="Recent plays">
        <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Recent plays</div>
        <ul className="flex flex-col gap-1">
          {props.history.map((h) => {
            const badge = sourceBadge(h.source, h.requestedByName)
            return (
              <li key={`${h.title}-${h.airedAt}`} className="flex items-center gap-2 text-sm">
                <span className="truncate">{h.title}</span>
                {h.artist ? <span className="text-muted-foreground truncate text-xs">{h.artist}</span> : null}
                {badge ? <span className="text-muted-foreground ml-auto shrink-0 text-xs">{badge}</span> : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
