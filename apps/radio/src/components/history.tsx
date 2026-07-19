import { clock } from "../lib/format"
import type { HistoryItem } from "../lib/radio-client"

export function History({ items }: { items: HistoryItem[] }) {
  return (
    <section aria-label="History" className="mt-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">History</div>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-[color:var(--border)] py-2 opacity-70">
          <div className="size-8 shrink-0 rounded-md" style={{ background: "linear-gradient(135deg,#33353f,#1c1e25)" }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{it.title}</div>
            {it.artist && <div className="truncate text-xs text-[color:var(--muted-foreground)]">{it.artist}</div>}
          </div>
          <span className="ml-auto font-mono text-xs text-[color:var(--muted-foreground)]">{clock(it.airedAt)}</span>
        </div>
      ))}
    </section>
  )
}
