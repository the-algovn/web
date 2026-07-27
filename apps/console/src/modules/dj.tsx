import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@algovn/ui/card"
import { Input } from "@algovn/ui/input"
import { Label } from "@algovn/ui/label"
import { NativeSelect, NativeSelectOption } from "@algovn/ui/native-select"
import { Slider } from "@algovn/ui/slider"
import { useState } from "react"
import { PresignedAudio } from "../components/presigned-audio"
import { useAuth } from "../lib/use-auth"
import { PREVIEW_MAX_RUNES, useDJSettings } from "../lib/use-dj-settings"

const DEFAULT_PREVIEW_TEXT = "Đây là Tiểu Dương Dương, bạn đang nghe Tần Số Bốn Mươi Hai."

// Số nguyên không âm từ input type=number; chuỗi rỗng/NaN → 0.
const intOrZero = (raw: string) => Math.max(0, Math.trunc(Number(raw) || 0))

export function DJ() {
  const { token } = useAuth()
  const s = useDJSettings(token)
  const [previewText, setPreviewText] = useState(DEFAULT_PREVIEW_TEXT)

  const previewRunes = [...previewText].length
  const selectedTier = s.voices.find((v) => v.id === s.form.voiceId)?.tier

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>DJ voice</CardTitle>
          <CardDescription>
            Persisted on the station row — the DJ picks changes up on the next prepared break
            (an already-rendered clip may still air once with the old voice).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dj-voice">Voice</Label>
            <div className="flex items-center gap-2">
              <NativeSelect
                id="dj-voice"
                value={s.form.voiceId}
                onChange={(e) => s.setForm({ ...s.form, voiceId: e.target.value })}
                disabled={s.loading}
              >
                <NativeSelectOption value="">— chọn giọng —</NativeSelectOption>
                {s.voices.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id ?? ""}>
                    {v.label} ({v.tier})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {selectedTier ? <Badge variant="secondary">{selectedTier}</Badge> : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {/* Slider forwards props to radix Root; the focusable element is
                the Thumb, so associate the name via aria-label, not htmlFor. */}
            <Label>Speaking rate</Label>
            <div className="flex items-center gap-3">
              <Slider
                aria-label="Speaking rate"
                min={0.7}
                max={1.3}
                step={0.05}
                value={[s.form.speakingRate]}
                onValueChange={([v]) => s.setForm({ ...s.form, speakingRate: v ?? 1 })}
                className="max-w-64"
              />
              <span className="font-mono text-xs">{s.form.speakingRate.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dj-break">Break every (tracks, 0 = off)</Label>
              <Input
                id="dj-break"
                type="number"
                min={0}
                value={s.form.breakEvery}
                onChange={(e) => s.setForm({ ...s.form, breakEvery: intOrZero(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dj-stationid">Station ID (minutes, 0 = off)</Label>
              <Input
                id="dj-stationid"
                type="number"
                min={0}
                value={s.form.stationIdMin}
                onChange={(e) => s.setForm({ ...s.form, stationIdMin: intOrZero(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dj-maxchars">Script cap (chars, 50–2000)</Label>
              <Input
                id="dj-maxchars"
                type="number"
                min={50}
                max={2000}
                value={s.form.maxChars}
                onChange={(e) => s.setForm({ ...s.form, maxChars: intOrZero(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Button onClick={() => void s.save()} disabled={s.busy || s.loading || !s.dirty}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Hear the selected voice/rate before saving. Previews spend real TTS budget (shared
            daily cap).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            aria-label="Preview text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void s.preview(previewText)}
              disabled={
                s.busy || !s.form.voiceId || !previewText.trim() || previewRunes > PREVIEW_MAX_RUNES
              }
            >
              Preview
            </Button>
            <span className="text-muted-foreground font-mono text-xs">
              {previewRunes}/{PREVIEW_MAX_RUNES}
            </span>
          </div>
          {s.take ? (
            <div className="flex items-center gap-3">
              <PresignedAudio artifactId={s.take.artifactId} className="h-9 flex-1" />
              {s.take.fake ? <Badge variant="outline">fake (no key)</Badge> : null}
              <span className="text-muted-foreground font-mono text-xs">
                ${s.take.costUsd.toFixed(4)}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
