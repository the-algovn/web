import type { TrackRequest } from "../lib/request-client"

const LABELS: Record<TrackRequest["status"], string> = {
  approved: "chờ tải",
  ready: "sẵn sàng",
  aired: "đã phát",
  failed: "lỗi",
}

export function MyRequests({ requests }: { requests: TrackRequest[] }) {
  if (requests.length === 0) return null
  return (
    <section aria-label="Yêu cầu của bạn" className="mt-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        Yêu cầu của bạn
      </div>
      {requests.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 border-t border-[color:var(--border)] py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.title}</div>
            {r.status === "failed" && r.failReason && (
              <div className="truncate text-xs text-[color:var(--muted-foreground)]">
                {r.failReason}
              </div>
            )}
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{
              color: "var(--radio-amber-soft)",
              background: "color-mix(in srgb, var(--radio-amber) 10%, transparent)",
            }}
          >
            {LABELS[r.status]}
          </span>
        </div>
      ))}
    </section>
  )
}
