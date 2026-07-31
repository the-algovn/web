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

export function BrainPlayground() {
  const { token } = useAuth()
  const [personaText, setPersonaText] = useState("")
  const [personaDirty, setPersonaDirty] = useState(false)
  const [clock, setClock] = useState("Thứ Năm 23:12")
  const [daypart, setDaypart] = useState("đêm khuya")
  const [onAirForMin, setOnAirForMin] = useState(120)
  const [listeners, setListeners] = useState(3)
  const [justTitle, setJustTitle] = useState("Lạc Trôi")
  const [justArtist, setJustArtist] = useState("Sơn Tùng M-TP")
  const [justRequestedBy, setJustRequestedBy] = useState("")
  const [nextTitle, setNextTitle] = useState("Em Của Ngày Hôm Qua")
  const [nextArtist, setNextArtist] = useState("Sơn Tùng M-TP")
  const [tonight, setTonight] = useState("")
  const [thread, setThread] = useState("")
  const [maxChars, setMaxChars] = useState(1500)
  const [model, setModel] = useState("script")
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
      // KEY ORDER IS LOAD-BEARING. The server forwards brief_json byte-for-byte
      // into the prompt so the bench's <brief> block matches the director's, and
      // the director marshals a Go struct — so these keys must appear in struct
      // field order: type, local_time, daypart, on_air_for_min, listeners,
      // just_played, coming_up, tonight, thread, recent_phrases, max_chars.
      // Note max_chars is assigned LAST, after the conditionals, not in the
      // literal. `listeners` is omitempty on the Go side, so a zero is omitted
      // there too rather than sent as 0.
      const brief: Record<string, unknown> = {
        type: "seam",
        local_time: clock,
        daypart,
        on_air_for_min: onAirForMin,
        ...(listeners > 0 ? { listeners } : {}),
        just_played: {
          title: justTitle,
          artist: justArtist,
          ...(justRequestedBy ? { source: "listener", requested_by_name: justRequestedBy } : {}),
        },
      }
      if (nextTitle) {
        brief.coming_up = { title: nextTitle, artist: nextArtist }
      }
      if (tonight.trim()) {
        brief.tonight = tonight
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => ({ title: l }))
      }
      if (thread.trim()) {
        brief.thread = thread.split("\n").map((l) => l.trim()).filter(Boolean)
      }
      brief.max_chars = maxChars

      const r = await labCall<ScriptResp>(token, "/brain/script", {
        briefJson: JSON.stringify(brief),
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
        { text: resp.script, voiceId, label: "speak:seam" },
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
            <input
              className={input}
              value={clock}
              onChange={(e) => setClock(e.target.value)}
              placeholder="local time"
            />
            <input
              className={input}
              value={daypart}
              onChange={(e) => setDaypart(e.target.value)}
              placeholder="daypart"
            />
            <label className="flex items-center gap-2 text-sm">
              on air (min)
              <input
                type="number"
                className={`${input} min-w-0`}
                value={onAirForMin}
                onChange={(e) => setOnAirForMin(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              listeners
              <input
                type="number"
                className={`${input} min-w-0`}
                value={listeners}
                onChange={(e) => setListeners(Number(e.target.value))}
              />
            </label>
            <input
              className={input}
              value={justTitle}
              onChange={(e) => setJustTitle(e.target.value)}
              placeholder="just played title"
            />
            <input
              className={input}
              value={justArtist}
              onChange={(e) => setJustArtist(e.target.value)}
              placeholder="just played artist"
            />
            <input
              className={`${input} col-span-2`}
              value={justRequestedBy}
              onChange={(e) => setJustRequestedBy(e.target.value)}
              placeholder="just played — requested by (optional)"
            />
            <input
              className={input}
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
              placeholder="coming up title (optional)"
            />
            <input
              className={input}
              value={nextArtist}
              onChange={(e) => setNextArtist(e.target.value)}
              placeholder="coming up artist"
            />
            <textarea
              className={`${input} col-span-2`}
              value={tonight}
              onChange={(e) => setTonight(e.target.value)}
              placeholder="tonight (one title per line)"
            />
            <textarea
              className={`${input} col-span-2`}
              value={thread}
              onChange={(e) => setThread(e.target.value)}
              placeholder="thread (one line per entry)"
            />
            <select
              className={input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="script">script (airing model)</option>
              <option value="">default model</option>
              <option value="gemini">gemini</option>
              <option value="anthropic">anthropic</option>
              <option value="fake">fake</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
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
