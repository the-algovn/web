import { Skeleton } from "@algovn/ui/skeleton"
import type { NowPlaying } from "../lib/radio-client"

export function NowPlayingCard({ np }: { np: NowPlaying | null }) {
  return (
    <section aria-label="Now playing">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        Now playing
      </div>
      {!np ? (
        <div className="mt-2 flex gap-4">
          <Skeleton className="size-[76px] rounded-lg" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-start gap-4">
          <div
            className="size-[76px] shrink-0 rounded-lg"
            style={{
              background: np.thumbnailUrl
                ? `center/cover url(${np.thumbnailUrl})`
                : "linear-gradient(135deg,#3a3d49,#20222a)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{np.title}</div>
            {np.artist && (
              <div className="text-sm text-[color:var(--muted-foreground)]">
                {np.artist}
              </div>
            )}
            {np.dedication && (
              <div
                className="mt-2 rounded border-l-2 px-2.5 py-1.5 text-xs"
                style={{
                  color: "var(--radio-amber-soft)",
                  borderColor: "var(--radio-amber)",
                  background:
                    "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
                }}
              >
                {np.dedication}
              </div>
            )}
            {(np.source === "ai" || np.source === "listener") && (
              <div
                className="mt-2 rounded border-l-2 px-2.5 py-1.5 text-xs"
                style={{
                  color: "var(--radio-amber-soft)",
                  borderColor: "var(--radio-amber)",
                  background:
                    "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
                }}
              >
                {np.source === "ai"
                  ? np.reason
                    ? `Tiểu Dương Dương chọn: ${np.reason}`
                    : "Tiểu Dương Dương chọn"
                  : `Yêu cầu của ${np.requestedByName ?? "thính giả"}`}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
