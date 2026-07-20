import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RunPanel } from "../components/run-panel"
import { artifactUrl, labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface Art {
  id?: string
  kind?: string
  label?: string
  createdAt?: string
}
interface RenderResp {
  artifact?: { id?: string }
  durationS?: number
}

export function MiniRender() {
  const { token } = useAuth()
  const [tracks, setTracks] = useState<Art[]>([])
  const [takes, setTakes] = useState<Art[]>([])
  const [trackId, setTrackId] = useState("")
  const [takeId, setTakeId] = useState("")
  const [offset, setOffset] = useState(3)
  const [duck, setDuck] = useState(10)
  const [tail, setTail] = useState(3)
  const [running, setRunning] = useState(false)
  const [out, setOut] = useState<RenderResp | null>(null)

  useEffect(() => {
    if (!token) return
    labCall<{ artifacts?: Art[] }>(token, "/artifacts/list", { kind: "track" })
      .then((r) => {
        setTracks(r.artifacts ?? [])
        setTrackId(r.artifacts?.[0]?.id ?? "")
      })
      .catch((e: Error) => toast.error(e.message))
    labCall<{ artifacts?: Art[] }>(token, "/artifacts/list", { kind: "take" })
      .then((r) => {
        setTakes(r.artifacts ?? [])
        setTakeId(r.artifacts?.[0]?.id ?? "")
      })
      .catch(() => {})
  }, [token])

  async function run() {
    if (!token || !trackId || !takeId) {
      toast.error("need one track (Ingest) and one take (Voice audition) first")
      return
    }
    setRunning(true)
    setOut(null)
    try {
      setOut(
        await labCall<RenderResp>(token, "/render/preview", {
          trackArtifactId: trackId,
          voiceArtifactId: takeId,
          offsetS: offset,
          duckDb: duck,
          tailS: tail,
        }),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const input = "border-border bg-background rounded border px-2 py-1 text-sm"
  const slider = (
    label: string,
    v: number,
    set: (n: number) => void,
    min: number,
    max: number,
    step: number,
  ) => (
    <label className="flex items-center gap-2 text-sm">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(Number(e.target.value))}
      />
      <span className="w-10 font-mono text-xs">{v.toFixed(1)}</span>
    </label>
  )

  return (
    <RunPanel
      title="Mini-render"
      description="Voice ducked over a track's intro. Tune by ear — these values become Phase 1's render defaults."
      running={running}
      onRun={() => void run()}
      runLabel="Render preview"
      form={
        <>
          <select
            className={input}
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
          >
            {tracks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            className={input}
            value={takeId}
            onChange={(e) => setTakeId(e.target.value)}
          >
            {takes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {slider("offset s", offset, setOffset, 0, 15, 0.5)}
          {slider("duck dB", duck, setDuck, 0, 24, 0.5)}
          {slider("tail s", tail, setTail, 0, 10, 0.5)}
        </>
      }
      result={
        out ? (
          <div className="flex items-center gap-3">
            <audio
              controls
              src={artifactUrl(out.artifact?.id ?? "")}
              className="h-9 flex-1"
            >
              <track kind="captions" />
            </audio>
            <span className="text-muted-foreground font-mono text-xs">
              {out.durationS?.toFixed(1)}s
            </span>
          </div>
        ) : undefined
      }
    />
  )
}
