import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Input } from "@algovn/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@algovn/ui/table"
import { ArrowDown, ArrowUp, ListPlus, Music2, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { formatClock } from "../lib/media"
import type { Playlist } from "../lib/radio"

export function PlaylistEditor(props: {
  playlist: Playlist | null
  onAir: boolean
  busy: boolean
  onRename: (name: string) => void
  onRemoveTrack: (ytId: string) => void
  onReorder: (ytIds: string[]) => void
  onOpenAddTracks: () => void
}) {
  const sum = props.playlist?.summary
  const tracks = props.playlist?.tracks ?? []
  const ids: string[] = tracks.map((t) => t.ytId ?? "")
  const [name, setName] = useState(sum?.name ?? "")
  const dragFrom = useRef<number | null>(null)
  useEffect(() => {
    setName(sum?.name ?? "")
  }, [sum?.name])

  if (!props.playlist) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <EmptyState
          icon={<Music2 />}
          title="No playlist selected."
          description="Pick a playlist on the left or create a new one."
        />
      </div>
    )
  }

  const isActive = sum?.isActive === true
  // Mirror of the server guard: can't empty the active playlist while on-air.
  const removeLocked = props.onAir && isActive && tracks.length === 1

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length || from === to) return
    const next = [...ids]
    const [x] = next.splice(from, 1) as [string]
    next.splice(to, 0, x)
    props.onReorder(next)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== sum?.name) props.onRename(name.trim())
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          aria-label="Playlist name"
          className="max-w-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={props.onOpenAddTracks}
          disabled={props.busy}
        >
          <ListPlus /> Add tracks
        </Button>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Music2 />}
          title="Empty playlist."
          description="Add tracks from the library."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>title</TableHead>
              <TableHead>channel</TableHead>
              <TableHead>dur</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks.map((t, i) => (
              <TableRow
                key={t.ytId}
                draggable
                onDragStart={() => {
                  dragFrom.current = i
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom.current !== null) move(dragFrom.current, i)
                  dragFrom.current = null
                }}
              >
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="max-w-56 truncate">{t.title}</TableCell>
                <TableCell className="max-w-32 truncate">{t.channel}</TableCell>
                <TableCell>{formatClock(Number(t.durationS))}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move up ${t.title ?? ""}`}
                      disabled={props.busy || i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move down ${t.title ?? ""}`}
                      disabled={props.busy || i === tracks.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${t.title ?? ""}`}
                      disabled={props.busy || removeLocked}
                      onClick={() => props.onRemoveTrack(t.ytId ?? "")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
