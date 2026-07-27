import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { labCall, radioCall } from "./api"
import type { DJSettings, StationResponse } from "./radio"

export interface Voice {
  id?: string
  label?: string
  tier?: string
}

export interface DJForm {
  voiceId: string
  speakingRate: number
  breakEvery: number
  stationIdMin: number
  maxChars: number
}

export interface PreviewTake {
  artifactId: string
  costUsd: number
  fake: boolean
}

export const PREVIEW_MAX_RUNES = 200

// protojson omits zero-valued fields — absent numerics mean 0 (= disabled).
export function formFromWire(dj?: DJSettings): DJForm {
  return {
    voiceId: dj?.voiceId ?? "",
    speakingRate: dj?.speakingRate ?? 0,
    breakEvery: dj?.breakEvery ?? 0,
    stationIdMin: dj?.stationIdMin ?? 0,
    maxChars: dj?.maxChars ?? 0,
  }
}

function sameForm(a: DJForm, b: DJForm): boolean {
  return (
    a.voiceId === b.voiceId &&
    a.speakingRate === b.speakingRate &&
    a.breakEvery === b.breakEvery &&
    a.stationIdMin === b.stationIdMin &&
    a.maxChars === b.maxChars
  )
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// DJ settings live on the station row (POST /radio/station/dj); the voice
// catalog + preview synth ride the prod-registered lab endpoints — the
// Library-module precedent. Previews spend real TTS budget (shared daily cap).
export function useDJSettings(token: string | null) {
  const [form, setForm] = useState<DJForm>(formFromWire(undefined))
  const [saved, setSaved] = useState<DJForm>(formFromWire(undefined))
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [take, setTake] = useState<PreviewTake | null>(null)

  useEffect(() => {
    if (!token) return
    let live = true
    Promise.all([
      radioCall<StationResponse>(token, "/station"),
      labCall<{ voices?: Voice[] }>(token, "/voices"),
    ])
      .then(([st, v]) => {
        if (!live) return
        const f = formFromWire(st.dj)
        setForm(f)
        setSaved(f)
        // "fake" is preview-only server-side; never offer it for saving.
        setVoices((v.voices ?? []).filter((x) => x.id !== "fake"))
      })
      .catch((e) => toast.error(msg(e)))
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [token])

  const save = useCallback(async () => {
    if (!token) return
    setBusy(true)
    try {
      const r = await radioCall<{ settings?: DJSettings }>(token, "/station/dj", {
        settings: {
          voiceId: form.voiceId,
          speakingRate: form.speakingRate,
          breakEvery: form.breakEvery,
          stationIdMin: form.stationIdMin,
          maxChars: form.maxChars,
        },
      })
      const f = formFromWire(r.settings)
      setForm(f)
      setSaved(f)
      toast.success("DJ settings saved — next break picks them up")
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setBusy(false)
    }
  }, [token, form])

  const preview = useCallback(
    async (text: string) => {
      if (!token) return
      setBusy(true)
      setTake(null)
      try {
        const r = await labCall<{ artifact?: { id?: string }; costUsd?: number; fake?: boolean }>(
          token,
          "/voice/synthesize",
          { text, voiceId: form.voiceId, speakingRate: form.speakingRate, label: "dj-preview" },
        )
        setTake({ artifactId: r.artifact?.id ?? "", costUsd: r.costUsd ?? 0, fake: r.fake ?? false })
      } catch (e) {
        toast.error(msg(e))
      } finally {
        setBusy(false)
      }
    },
    [token, form.voiceId, form.speakingRate],
  )

  return { form, setForm, dirty: !sameForm(form, saved), voices, loading, busy, take, save, preview }
}
