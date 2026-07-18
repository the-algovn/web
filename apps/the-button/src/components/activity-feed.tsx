import type { FeedItem } from "../lib/activity"

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <section aria-label="live activity" className="tb-box p-4 text-left">
      <h2 className="text-muted-foreground mb-3 font-mono text-sm">{"// live activity"}</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground font-mono text-xs">watching the counter…</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.id} className="tb-feed-item flex items-center gap-2 font-mono text-xs">
              <span className="text-primary font-bold tabular-nums">
                +{it.amount.toLocaleString("en-US")}
              </span>
              <span className="text-muted-foreground">clicks</span>
              <span className="text-muted-foreground ml-auto opacity-60">just now</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
