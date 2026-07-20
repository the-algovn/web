import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PresignedAudio } from "../components/presigned-audio"
import { RunPanel } from "../components/run-panel"
import { labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface Voice {
  id?: string
  label?: string
  tier?: string
}
interface Take {
  voiceId: string
  artifactId: string
  costUsd: number
  fake: boolean
}

const DEFAULT_TEXT =
  "Mười một giờ đêm rồi đó, bạn nghe đài thân mến… Dương Dương vẫn ở đây, trên Tần Số Bốn Mươi Hai."

export function VoiceAudition() {
  const { token } = useAuth()
  const [voices, setVoices] = useState<Voice[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [text, setText] = useState(DEFAULT_TEXT)
  const [rate, setRate] = useState(1.0)
  const [label, setLabel] = useState("")
  const [takes, setTakes] = useState<Take[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!token) return
    labCall<{ voices?: Voice[] }>(token, "/voices")
      .then((r) => {
        setVoices(r.voices ?? [])
        setSelected((r.voices ?? []).slice(0, 2).map((v) => v.id ?? ""))
      })
      .catch((e: Error) => toast.error(e.message))
  }, [token])

  async function run() {
    if (!token || selected.length === 0) return
    setRunning(true)
    setTakes([])
    try {
      for (const voiceId of selected) {
        const r = await labCall<{
          artifact?: { id?: string }
          costUsd?: number
          fake?: boolean
        }>(token, "/voice/synthesize", {
          text,
          voiceId,
          speakingRate: rate,
          label: label || voiceId,
        })
        setTakes((t) => [
          ...t,
          {
            voiceId,
            artifactId: r.artifact?.id ?? "",
            costUsd: r.costUsd ?? 0,
            fake: r.fake ?? false,
          },
        ])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <RunPanel
      title="Voice audition"
      description="Same text across candidate voices — pick Tiểu Dương Dương's voice with your ears."
      running={running}
      onRun={() => void run()}
      runLabel={`Synthesize ${selected.length} voice(s)`}
      costUsd={takes.reduce((s, t) => s + t.costUsd, 0)}
      form={
        <>
          <textarea
            className="border-border bg-background min-h-24 w-full rounded border p-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {voices.map((v) => (
              <label
                key={v.id}
                className="border-border flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(v.id ?? "")}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, v.id ?? ""]
                        : s.filter((x) => x !== v.id),
                    )
                  }
                />
                {v.label}{" "}
                <span className="text-muted-foreground">({v.tier})</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              rate
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
              <span className="font-mono text-xs">{rate.toFixed(2)}</span>
            </label>
            <input
              className="border-border bg-background rounded border px-2 py-1 text-sm"
              placeholder="take label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </>
      }
      result={
        takes.length ? (
          <div className="flex flex-col gap-3">
            {takes.map((t) => (
              <div key={t.artifactId} className="flex items-center gap-3">
                <span className="w-48 truncate font-mono text-xs">
                  {t.voiceId}
                  {t.fake ? " (fake)" : ""}
                </span>
                <PresignedAudio artifactId={t.artifactId} className="h-9 flex-1" />
                <span className="text-muted-foreground font-mono text-xs">
                  ${t.costUsd.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        ) : undefined
      }
    />
  )
}
