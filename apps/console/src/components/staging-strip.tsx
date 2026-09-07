import { Badge } from "@algovn/ui/badge"
import { Download } from "lucide-react"
import type { Segment } from "../lib/show-timeline"

// Approved but not airable yet. Deliberately OFF the time axis: the download
// has no air time, and giving it one would be a projection nobody can honour.
export function StagingStrip({ items }: { items: Segment[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Staging" className="border-border rounded-lg border border-dashed p-2">
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        <Download className="size-3.5" /> Staging
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-sm">
            <span className="max-w-60 truncate">{s.title || "Untitled"}</span>
            <Badge variant="outline">{s.status || "staging"}</Badge>
          </li>
        ))}
      </ul>
    </section>
  )
}
