import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Skeleton } from "@algovn/ui/skeleton"
import { WifiOff } from "lucide-react"
import { useState } from "react"
import { LLMCallDrawer } from "../components/llm-call-drawer"
import { ShowList } from "../components/show-list"
import { ShowRibbon } from "../components/show-ribbon"
import { StationBar } from "../components/station-bar"
import { useAuth } from "../lib/use-auth"
import { useShowTimeline } from "../lib/use-show-timeline"
import { useStation } from "../lib/use-station"

// The station console: the operator's master row, then the show as one
// timeline - what aired, what is airing, and a running order that states how
// sure it is about every row.
export function Radio() {
  const { token } = useAuth()
  const st = useStation(token)
  const show = useShowTimeline(token)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col">
      <StationBar
        station={st.station}
        stats={st.stats}
        busy={st.busy}
        onGoOnAir={() => void st.goOnAir()}
        onGoOffAir={() => void st.goOffAir()}
        onToggleAI={(enabled) => void st.setAIEnabled(enabled)}
      />
      <div className="min-h-0 flex-1 overflow-auto p-6">
        {show.timeline ? (
          <div className="flex flex-col gap-4">
            {show.page === 0 ? (
              <ShowRibbon
                timeline={show.timeline}
                nowMs={show.nowMs}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              />
            ) : (
              // past[] is the requested page, and on page 1+ every row of it is
              // hours old and falls outside the ribbon's 50-minute window. The
              // ribbon would draw an empty left half, which reads as "nothing
              // aired recently" on a station that is on air.
              <p className="text-muted-foreground border-border rounded-lg border px-3 py-2 text-xs">
                The ribbon follows the live window. The list below is showing an older page.
              </p>
            )}
            <ShowList
              timeline={show.timeline}
              nowMs={show.nowMs}
              selectedId={selectedId}
              onSelect={setSelectedId}
              busy={show.busy}
              page={show.page}
              pageSize={show.pageSize}
              onPage={show.setPage}
              onSkip={() => void show.skip()}
              onMove={(id, delta) => void show.move(id, delta)}
              onRemove={(id) => void show.remove(id)}
              onForceBreak={() => void show.forceBreak()}
              onCancelBreak={() => void show.cancelBreak()}
              renderDetail={(seg) =>
                token && seg.correlationId ? (
                  <LLMCallDrawer token={token} correlationId={seg.correlationId} />
                ) : null
              }
            />
          </div>
        ) : show.loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<WifiOff />}
            title="The show could not be loaded."
            description="The console will keep retrying in the background."
            action={
              <Button variant="outline" size="sm" onClick={show.refresh}>
                Retry
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
