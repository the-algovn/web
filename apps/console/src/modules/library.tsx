import { Button } from "@algovn/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { RunPanel } from "../components/run-panel"
import { artifactUrl, labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface Track {
  ytId?: string
  title?: string
  channel?: string
  durationS?: number
  artifactId?: string
  inputI?: number
  inputTp?: number
  inputLra?: number
  addedAt?: string
}

export function Library() {
  const { token } = useAuth()
  const [query, setQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState<Record<string, true>>({})

  async function search() {
    if (!token) return
    setRunning(true)
    try {
      const r = await labCall<{ tracks?: Track[] }>(token, "/library/list", {
        query,
        limit: 50,
      })
      setTracks(r.tracks ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function del(t: Track) {
    if (!token || !t.ytId) return
    setBusy((b) => ({ ...b, [t.ytId as string]: true }))
    try {
      await labCall(token, "/library/delete", { ytId: t.ytId })
      await search()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      setBusy((b) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure-to-drop; _drop is intentionally discarded
        const { [t.ytId as string]: _drop, ...rest } = b
        return rest
      })
    }
  }

  return (
    <RunPanel
      title="Library"
      description="Downloaded tracks — search by title/channel, preview, or remove."
      running={running}
      onRun={() => void search()}
      runLabel="Search"
      form={
        <input
          className="border-border bg-background w-full rounded border px-2 py-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="title or channel"
        />
      }
      result={
        tracks.length ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th>title</th>
                <th>channel</th>
                <th>dur</th>
                <th>LUFS</th>
                <th>added</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={t.ytId} className="border-border border-t align-top">
                  <td className="max-w-56 truncate pr-2">{t.title}</td>
                  <td className="max-w-32 truncate pr-2">{t.channel}</td>
                  <td className="pr-2">{t.durationS}s</td>
                  <td className="pr-2 font-mono">{t.inputI?.toFixed(1)}</td>
                  <td className="pr-2">{t.addedAt?.slice(0, 10)}</td>
                  <td className="pr-2">
                    <audio
                      controls
                      src={artifactUrl(t.artifactId ?? "")}
                      className="h-8 w-44"
                    >
                      <track kind="captions" />
                    </audio>
                  </td>
                  <td>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busy[t.ytId ?? ""]}
                      onClick={() => void del(t)}
                    >
                      {busy[t.ytId ?? ""] ? "…" : "Delete"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined
      }
    />
  )
}
