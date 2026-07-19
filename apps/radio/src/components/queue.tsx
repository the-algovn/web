import type { QueueItem } from "../lib/radio-client"

export function Queue({ items }: { items: QueueItem[] }) {
  return (
    <section aria-label="Up next" className="mt-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Up next</div>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-[color:var(--border)] py-2">
          <div className="size-8 shrink-0 rounded-md" style={{ background: "linear-gradient(135deg,#33353f,#1c1e25)" }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{it.title}</div>
            {it.artist && <div className="truncate text-xs text-[color:var(--muted-foreground)]">{it.artist}</div>}
          </div>
          {it.hasDedication && (
            <span aria-label="has dedication" className="ml-auto rounded-full px-2 py-0.5 text-[10px]" style={{ color: "var(--radio-amber-soft)", background: "color-mix(in srgb, var(--radio-amber) 10%, transparent)" }}>
              🎁
            </span>
          )}
        </div>
      ))}
    </section>
  )
}
