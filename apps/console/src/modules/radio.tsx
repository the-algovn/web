import { useState } from "react"
import { AddTracksDrawer } from "../components/add-tracks-drawer"
import { PlaylistEditor } from "../components/playlist-editor"
import { PlaylistsPane } from "../components/playlists-pane"
import { StationBar } from "../components/station-bar"
import { useAuth } from "../lib/use-auth"
import { useRadioAdmin } from "../lib/use-radio-admin"

export function Radio() {
  const { token } = useAuth()
  const admin = useRadioAdmin(token)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const onAir = admin.station?.onAir === true

  return (
    <div className="flex h-full flex-col">
      <StationBar
        station={admin.station}
        busy={admin.busy}
        onGoOnAir={() => void admin.goOnAir()}
        onGoOffAir={() => void admin.goOffAir()}
      />
      <div className="flex min-h-0 flex-1 gap-6 overflow-auto p-6">
        <PlaylistsPane
          playlists={admin.playlists}
          selectedId={admin.selectedId}
          onAir={onAir}
          busy={admin.busy}
          onSelect={admin.select}
          onCreate={(name) => void admin.create(name)}
          onSetActive={(id) => void admin.setActive(id)}
          onDelete={(id) => void admin.removePlaylist(id)}
        />
        <PlaylistEditor
          playlist={admin.selected}
          onAir={onAir}
          busy={admin.busy}
          onRename={(name) => {
            if (admin.selectedId) void admin.rename(admin.selectedId, name)
          }}
          onRemoveTrack={(ytId) => void admin.removeTrack(ytId)}
          onReorder={(ytIds) => void admin.reorder(ytIds)}
          onOpenAddTracks={() => setDrawerOpen(true)}
        />
      </div>
      <AddTracksDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        existingYtIds={(admin.selected?.tracks ?? []).map((t) => t.ytId ?? "")}
        busy={admin.busy}
        onAdd={(ytIds) => {
          void (async () => {
            for (const yt of ytIds) {
              await admin.addTrack(yt)
            }
          })()
        }}
      />
    </div>
  )
}
