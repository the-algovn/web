import { Button } from "@algovn/ui/button"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PresignedAudio } from "../components/presigned-audio"
import { RunPanel } from "../components/run-panel"
import { labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface ScriptResp {
  script?: string
  summary?: string
  usedPhrases?: string[]
  violations?: string[]
  inTokens?: number
  outTokens?: number
  costUsd?: number
  fake?: boolean
  model?: string
}

const SEGMENT_TYPES = [
  "intro",
  "backsell",
  "station_id",
  "dedication_read",
  "wake_greeting",
  "musing",
  "daypart_transition",
]

export function BrainPlayground() {
  const { token } = useAuth()
  const [personaText, setPersonaText] = useState("")
  const [personaDirty, setPersonaDirty] = useState(false)
  const [segType, setSegType] = useState("intro")
  const [clock, setClock] = useState("hai mươi ba giờ mười hai, thứ Năm")
  const [nextTitle, setNextTitle] = useState("Em Của Ngày Hôm Qua")
  const [nextArtist, setNextArtist] = useState("Sơn Tùng M-TP")
  const [dedFrom, setDedFrom] = useState("Đức")
  const [dedTo, setDedTo] = useState("Ngọc")
  const [dedDigest, setDedDigest] = useState(
    "muốn quay về hôm qua để gặp lại nụ cười đó",
  )
  const [dedWeight, setDedWeight] = useState("heavy")
  const [model, setModel] = useState("")
  const [maxChars, setMaxChars] = useState(700)
  const [running, setRunning] = useState(false)
  const [resp, setResp] = useState<ScriptResp | null>(null)
  const [speakId, setSpeakId] = useState("")
  const [voiceId, setVoiceId] = useState("")

  useEffect(() => {
    if (!token) return
    labCall<{ content?: string }>(token, "/persona")
      .then((r) => setPersonaText(r.content ?? ""))
      .catch((e: Error) => toast.error(e.message))
    labCall<{ voices?: { id?: string }[] }>(token, "/voices")
      .then((r) => setVoiceId(r.voices?.[0]?.id ?? ""))
      .catch(() => {})
  }, [token])

  async function savePersona() {
    if (!token) return
    try {
      await labCall(token, "/persona/save", { content: personaText })
      setPersonaDirty(false)
      toast.success("persona saved (remember to commit persona/*.md)")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  async function run() {
    if (!token) return
    setRunning(true)
    setResp(null)
    setSpeakId("")
    try {
      const dedications =
        dedFrom || dedTo
          ? [{ from: dedFrom, to: dedTo, digest: dedDigest, weight: dedWeight }]
          : []
      const r = await labCall<ScriptResp>(token, "/brain/script", {
        brief: {
          type: segType,
          clock,
          next: { title: nextTitle, artist: nextArtist },
          dedications,
          maxChars,
        },
        model,
        personaOverride: personaDirty ? personaText : "",
      })
      setResp(r)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function speak() {
    if (!token || !resp?.script) return
    try {
      const r = await labCall<{ artifact?: { id?: string } }>(
        token,
        "/voice/synthesize",
        { text: resp.script, voiceId, label: `speak:${segType}` },
      )
      setSpeakId(r.artifact?.id ?? "")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const input = "border-border bg-background rounded border px-2 py-1 text-sm"
  return (
    <RunPanel
      title="Brain playground"
      description="Persona → brief → script → ears. The core loop that tunes Tiểu Dương Dương."
      running={running}
      onRun={() => void run()}
      runLabel="Generate script"
      costUsd={resp?.costUsd}
      form={
        <>
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Persona bible {personaDirty ? "(edited — used as override)" : ""}
            </summary>
            <textarea
              className={`${input} mt-2 min-h-56 w-full font-mono text-xs`}
              value={personaText}
              onChange={(e) => {
                setPersonaText(e.target.value)
                setPersonaDirty(true)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void savePersona()}
              disabled={!personaDirty}
            >
              Save persona to repo
            </Button>
          </details>
          <div className="grid grid-cols-2 gap-2">
            <select
              className={input}
              value={segType}
              onChange={(e) => setSegType(e.target.value)}
            >
              {SEGMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              className={input}
              value={clock}
              onChange={(e) => setClock(e.target.value)}
              placeholder="clock (bằng chữ)"
            />
            <input
              className={input}
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
              placeholder="next title"
            />
            <input
              className={input}
              value={nextArtist}
              onChange={(e) => setNextArtist(e.target.value)}
              placeholder="next artist"
            />
            <input
              className={input}
              value={dedFrom}
              onChange={(e) => setDedFrom(e.target.value)}
              placeholder="dedication from"
            />
            <input
              className={input}
              value={dedTo}
              onChange={(e) => setDedTo(e.target.value)}
              placeholder="to"
            />
            <input
              className={`${input} col-span-2`}
              value={dedDigest}
              onChange={(e) => setDedDigest(e.target.value)}
              placeholder="digest"
            />
            <select
              className={input}
              value={dedWeight}
              onChange={(e) => setDedWeight(e.target.value)}
            >
              <option>casual</option>
              <option>warm</option>
              <option>heavy</option>
            </select>
            <select
              className={input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">default model</option>
              <option value="gemini">gemini</option>
              <option value="anthropic">anthropic</option>
              <option value="fake">fake</option>
            </select>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              max chars
              <input
                type="number"
                className={input}
                value={maxChars}
                onChange={(e) => setMaxChars(Number(e.target.value))}
              />
            </label>
          </div>
        </>
      }
      result={
        resp ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed">{resp.script}</p>
            {(resp.violations ?? []).map((v) => (
              <p key={v} className="text-destructive font-mono text-xs">
                ⚠ {v}
              </p>
            ))}
            <p className="text-muted-foreground text-xs">
              summary: {resp.summary} · {resp.model} · {resp.inTokens}→
              {resp.outTokens} tok{resp.fake ? " · FAKE" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void speak()}>
                Speak it ({voiceId || "no voice"})
              </Button>
              {speakId ? (
                <PresignedAudio artifactId={speakId} className="h-9" />
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    />
  )
}
