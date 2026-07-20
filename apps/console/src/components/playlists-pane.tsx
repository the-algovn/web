import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Input } from "@algovn/ui/input"
import { cn } from "@algovn/ui/lib/utils"
import { ListMusic, Plus, Star, Trash2 } from "lucide-react"
import { useState } from "react"
import { formatClock } from "../lib/media"
import type { PlaylistSummary } from "../lib/radio"

export function PlaylistsPane(props: {
  playlists: PlaylistSummary[]
  selectedId: string | null
  onAir: boolean
  busy: boolean
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onSetActive: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState("")
  function create() {
    const n = name.trim()
    if (!n) return
    props.onCreate(n)
    setName("")
  }
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create()
          }}
          placeholder="new playlist name"
          aria-label="New playlist name"
        />
        <Button size="icon" aria-label="Create playlist" disabled={props.busy} onClick={create}>
          <Plus />
        </Button>
      </div>
      {props.playlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic />}
          title="No playlists yet."
          description="Create one, then add tracks from the library."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {props.playlists.map((p) => {
            const active = p.isActive === true
            return (
              <li key={p.id}>
                {/* biome-ignore lint/a11y/useSemanticElements: container div wraps both the selectable row and action buttons; div structure is intentional */}
                <div
                  className={cn(
                    "hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5",
                    props.selectedId === p.id && "bg-accent",
                  )}
                  onClick={() => props.onSelect(p.id ?? "")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") props.onSelect(p.id ?? "")
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm">{p.name}</span>
                      {active ? <Badge>active</Badge> : null}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {p.trackCount ?? 0} tracks · {formatClock(Number(p.totalDurationS ?? 0))}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Set active ${p.name ?? ""}`}
                    disabled={props.busy || active || (p.trackCount ?? 0) === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.onSetActive(p.id ?? "")
                    }}
                  >
                    <Star />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${p.name ?? ""}`}
                    disabled={props.busy || (active && props.onAir)}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.onDelete(p.id ?? "")
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
