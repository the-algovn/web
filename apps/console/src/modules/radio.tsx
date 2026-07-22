import { NowPlayingCard } from "../components/now-playing-card"
import { QueuePane } from "../components/queue-pane"
import { RecentPane } from "../components/recent-pane"
import { StationBar } from "../components/station-bar"
import { useAuth } from "../lib/use-auth"
import { useStation } from "../lib/use-station"

// The station console (v1.2): mirrors the real air — the playlist era is gone.
export function Radio() {
  const { token } = useAuth()
  const st = useStation(token)

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
      <div className="flex min-h-0 flex-1 gap-6 overflow-auto p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <NowPlayingCard np={st.nowPlaying} busy={st.busy} onSkip={() => void st.skip()} />
          <QueuePane
            pending={st.pending}
            busy={st.busy}
            onReorder={(ids) => void st.reorder(ids)}
            onRemove={(id) => void st.remove(id)}
          />
        </div>
        <div className="w-80 shrink-0">
          <RecentPane recent={st.recent} history={st.history} />
        </div>
      </div>
    </div>
  )
}
