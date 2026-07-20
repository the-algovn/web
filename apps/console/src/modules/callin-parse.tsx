import { Button } from "@algovn/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { RunPanel } from "../components/run-panel"
import { labCall } from "../lib/api"
import { useAuth } from "../lib/use-auth"

interface ParseResp {
  songQuery?: string
  recipient?: string
  message?: string
  verdict?: string
  rejectReason?: string
  digest?: string
  weight?: string
  costUsd?: number
  fake?: boolean
}

export function CallinParse() {
  const { token } = useAuth()
  const [text, setText] = useState(
    "Cho mình xin bài Em Của Ngày Hôm Qua, gửi tặng Ngọc — chúc ngủ ngon nha",
  )
  const [resp, setResp] = useState<ParseResp | null>(null)
  const [running, setRunning] = useState(false)
  const [fixtureName, setFixtureName] = useState("")

  async function run() {
    if (!token) return
    setRunning(true)
    setResp(null)
    try {
      setResp(await labCall<ParseResp>(token, "/callin/parse", { text }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function saveFixture() {
    if (!token || !resp) return
    try {
      const r = await labCall<{ path?: string }>(token, "/fixtures", {
        name: fixtureName,
        rawText: text,
        expectedJson: JSON.stringify(resp),
      })
      toast.success(`fixture saved: ${r.path} — commit it`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <RunPanel
      title="Call-in parse"
      description="Raw call-in → parsed fields + moderation verdict. Save good cases as fixtures."
      running={running}
      onRun={() => void run()}
      runLabel="Parse"
      costUsd={resp?.costUsd}
      form={
        <textarea
          className="border-border bg-background min-h-24 w-full rounded border p-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      }
      result={
        resp ? (
          <div className="flex flex-col gap-2 text-sm">
            <pre className="bg-muted overflow-auto rounded p-2 font-mono text-xs">
              {JSON.stringify(resp, null, 2)}
            </pre>
            <div className="flex items-center gap-2">
              <input
                className="border-border bg-background rounded border px-2 py-1 text-sm"
                placeholder="fixture-name-kebab"
                value={fixtureName}
                onChange={(e) => setFixtureName(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!fixtureName}
                onClick={() => void saveFixture()}
              >
                Save as fixture
              </Button>
            </div>
          </div>
        ) : undefined
      }
    />
  )
}
