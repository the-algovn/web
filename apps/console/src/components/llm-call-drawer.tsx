import { Badge } from "@algovn/ui/badge"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { labCall } from "../lib/api"
import type { LLMCall, ListResp } from "../lib/llm-audit"

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Every model call made for one break, in place. The correlation id groups
// them - one prepare makes up to two, because the script validation loop
// retries once.
export function LLMCallDrawer({ token, correlationId }: { token: string; correlationId: string }) {
  const [calls, setCalls] = useState<LLMCall[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token || !correlationId) return
    let live = true
    setFailed(false)
    labCall<ListResp>(token, "/llm-calls/list", { correlationId, limit: 20, offset: 0 })
      .then((r) => {
        if (live) setCalls(r.calls ?? [])
      })
      .catch((e) => {
        if (!live) return
        setCalls(null)
        setFailed(true)
        toast.error(msg(e))
      })
    return () => {
      live = false
    }
  }, [token, correlationId])

  if (!correlationId) return null
  if (failed) return <div className="text-destructive text-xs">Could not load model calls.</div>
  if (calls === null) return <div className="text-muted-foreground text-xs">Loading model calls...</div>
  if (calls.length === 0) {
    // Retention is 30 days and station IDs are not scripted, so a miss is
    // normal - say which, rather than rendering an empty box.
    return <div className="text-muted-foreground text-xs">No model calls for this segment (pruned, or not scripted).</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {calls.map((c) => (
        <div key={String(c.id ?? c.ts)} className="border-border rounded border p-2">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <Badge variant={c.error ? "destructive" : "secondary"}>{c.label}</Badge>
            <span className="text-muted-foreground font-mono">
              {c.model} - {c.inTokens ?? 0}/{c.outTokens ?? 0} tok - ${(c.costUsd ?? 0).toFixed(4)} - {c.latencyMs ?? 0}ms
            </span>
          </div>
          {c.error ? <div className="text-destructive text-xs">error: {c.error}</div> : null}
          <Field title="system" body={c.systemPrompt ?? ""} />
          <Field title="user" body={c.userPrompt ?? ""} />
          <Field title="output" body={c.output ?? ""} />
        </div>
      ))}
    </div>
  )
}

function Field({ title, body }: { title: string; body: string }) {
  if (!body) return null
  return (
    <div className="mt-1">
      <div className="text-muted-foreground text-[10px] uppercase">{title}</div>
      <pre className="bg-muted max-h-40 overflow-auto whitespace-pre-wrap rounded p-1.5 font-mono text-xs">{body}</pre>
    </div>
  )
}
