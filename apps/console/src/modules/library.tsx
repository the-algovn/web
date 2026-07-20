import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Input } from "@algovn/ui/input"
import { Skeleton } from "@algovn/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@algovn/ui/table"
import { ListMusic, Play, Trash2 } from "lucide-react"
import { useCallback, useEffect } from "react"
import { TransportBar } from "../components/transport-bar"
import { presignArtifact } from "../lib/api"
import { PAGE_SIZE, formatClock } from "../lib/media"
import { useAuth } from "../lib/use-auth"
import { useLibrary } from "../lib/use-library"
import { usePlayer } from "../lib/use-player"

export function Library({ audio }: { audio?: HTMLAudioElement } = {}) {
  const { token } = useAuth()
  const lib = useLibrary(token)
  const resolveUrl = useCallback(
    async (id: string) => {
      const r = await presignArtifact(token ?? "", id)
      if (!r.url) throw new Error("no playable URL for artifact")
      return r.url
    },
    [token],
  )
  const player = usePlayer({ audio, resolveUrl })

  // Keep the player's queue aligned with the visible page.
  useEffect(() => {
    player.setQueue(lib.tracks)
  }, [lib.tracks, player.setQueue])

  const pageCount = Math.max(1, Math.ceil(lib.total / PAGE_SIZE))
  const from = lib.total === 0 ? 0 : lib.page * PAGE_SIZE + 1
  const to = Math.min((lib.page + 1) * PAGE_SIZE, lib.total)

  function del(ytId: string) {
    if (ytId === player.loadedYtId) player.stop()
    void lib.del(ytId)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
        <div>
          <h1 className="text-lg font-semibold">Library</h1>
          <p className="text-muted-foreground text-sm">
            Downloaded tracks — search, preview, remove.
          </p>
        </div>

        <Input
          value={lib.query}
          onChange={(e) => lib.setQuery(e.target.value)}
          placeholder="title or channel"
          className="max-w-sm"
        />

        {lib.loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                key={i}
                className="h-8 w-full"
              />
            ))}
          </div>
        ) : lib.tracks.length === 0 ? (
          <EmptyState
            icon={<ListMusic />}
            title="No tracks match."
            description="Try a different title or channel."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-9" />
                  <TableHead>title</TableHead>
                  <TableHead>channel</TableHead>
                  <TableHead>dur</TableHead>
                  <TableHead>LUFS</TableHead>
                  <TableHead>added</TableHead>
                  <TableHead className="w-9" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lib.tracks.map((t) => (
                  <TableRow key={t.ytId}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Play ${t.title ?? ""}`}
                        onClick={() =>
                          player.load(lib.tracks.findIndex((x) => x.ytId === t.ytId))
                        }
                      >
                        <Play />
                      </Button>
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{t.title}</TableCell>
                    <TableCell className="max-w-32 truncate">{t.channel}</TableCell>
                    <TableCell>{formatClock(Number(t.durationS))}</TableCell>
                    <TableCell className="font-mono">{t.inputI?.toFixed(1)}</TableCell>
                    <TableCell>{t.addedAt?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${t.title ?? ""}`}
                        disabled={!!lib.pending[t.ytId ?? ""]}
                        onClick={() => del(t.ytId ?? "")}
                      >
                        {lib.pending[t.ytId ?? ""] ? "…" : <Trash2 />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <nav
              aria-label="Pagination"
              className="text-muted-foreground flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lib.page === 0}
                  onClick={() => lib.setPage(lib.page - 1)}
                >
                  Prev
                </Button>
                <span>
                  Page {lib.page + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lib.page >= pageCount - 1}
                  onClick={() => lib.setPage(lib.page + 1)}
                >
                  Next
                </Button>
              </div>
              <span>
                rows {from}–{to} of {lib.total}
              </span>
            </nav>
          </>
        )}
      </div>

      <TransportBar
        track={player.track}
        status={player.status}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        canPrev={player.canPrev}
        canNext={player.canNext}
        onToggle={player.toggle}
        onSeek={player.seek}
        onVolume={player.setVolume}
        onPrev={player.prev}
        onNext={player.next}
      />
    </div>
  )
}
