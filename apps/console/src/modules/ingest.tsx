import { Button } from "@algovn/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { RunPanel } from "../components/run-panel"
import { artifactUrl, labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface Candidate {
  ytId?: string
  title?: string
  channel?: string
  durationS?: string | number
  viewCount?: string | number
  thumbnailUrl?: string
  score?: number
  scoreNotes?: string[]
}
interface DownloadResp {
  artifact?: { id?: string }
  durationS?: number
  inputI?: number
  inputTp?: number
  inputLra?: number
}

export function Ingest() {
  const { token } = useAuth()
  const [query, setQuery] = useState("em của ngày hôm qua sơn tùng")
  const [cands, setCands] = useState<Candidate[]>([])
  const [running, setRunning] = useState(false)
  const [dl, setDl] = useState<Record<string, DownloadResp | "busy">>({})

  async function run() {
    if (!token) return
    setRunning(true)
    setCands([])
    try {
      const r = await labCall<{ candidates?: Candidate[] }>(
        token,
        "/ingest/search",
        { query, limit: 10 },
      )
      setCands(r.candidates ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function download(c: Candidate) {
    const ytId = c.ytId
    if (!token || !ytId) return
    setDl((d) => ({ ...d, [ytId]: "busy" }))
    try {
      const r = await labCall<DownloadResp>(token, "/ingest/download", {
        ytId,
        title: c.title,
      })
      setDl((d) => ({ ...d, [ytId]: r }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
      setDl((d) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure-to-drop; _drop is intentionally discarded
        const { [ytId]: _drop, ...rest } = d
        return rest
      })
    }
  }

  return (
    <RunPanel
      title="Ingest"
      description="yt-dlp search + ranking (scores visible) → download one → duration + loudness readout."
      running={running}
      onRun={() => void run()}
      runLabel="Search"
      form={
        <input
          className="border-border bg-background w-full rounded border px-2 py-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      }
      result={
        cands.length ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th></th>
                <th>title</th>
                <th>channel</th>
                <th>dur</th>
                <th>views</th>
                <th>score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cands.map((c) => {
                const d = dl[c.ytId ?? ""]
                return (
                  <tr key={c.ytId} className="border-border border-t align-top">
                    <td className="py-1 pr-2">
                      {c.thumbnailUrl ? (
                        <img
                          src={c.thumbnailUrl}
                          alt={c.title ?? ""}
                          className="h-8 w-14 rounded object-cover"
                        />
                      ) : null}
                    </td>
                    <td
                      className="max-w-56 truncate pr-2"
                      title={(c.scoreNotes ?? []).join(", ")}
                    >
                      {c.title}
                    </td>
                    <td className="max-w-32 truncate pr-2">{c.channel}</td>
                    <td className="pr-2">{c.durationS}s</td>
                    <td className="pr-2">{c.viewCount}</td>
                    <td className="pr-2 font-mono">{c.score}</td>
                    <td>
                      {d === "busy" ? (
                        "…"
                      ) : d ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-mono">
                            {d.durationS?.toFixed(0)}s · {d.inputI?.toFixed(1)}{" "}
                            LUFS
                          </span>
                          <audio
                            controls
                            src={artifactUrl(d.artifact?.id ?? "")}
                            className="h-8 w-44"
                          >
                            <track kind="captions" />
                          </audio>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void download(c)}
                        >
                          Download
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : undefined
      }
    />
  )
}
