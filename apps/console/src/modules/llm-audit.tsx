import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { NativeSelect, NativeSelectOption } from "@algovn/ui/native-select"
import { Skeleton } from "@algovn/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@algovn/ui/table"
import { ScrollText } from "lucide-react"
import { Fragment, useState } from "react"
import { PAGE_SIZE } from "../lib/llm-audit"
import { useAuth } from "../lib/use-auth"
import { useLLMAudit } from "../lib/use-llm-audit"

// A value ending in ':' is a prefix filter server-side (query.sql ListLLMCalls).
// "director:backsell" is gone — the segment is "seam" now — so filter the whole
// director group rather than naming one segment.
const SITES = ["", "director:", "programmer:", "script:", "callin"]

export function LLMAudit() {
  const { token } = useAuth()
  const a = useLLMAudit(token)
  const [openId, setOpenId] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(a.total / PAGE_SIZE))
  const from = a.total === 0 ? 0 : a.page * PAGE_SIZE + 1
  const to = Math.min((a.page + 1) * PAGE_SIZE, a.total)

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">LLM calls</h1>
        <p className="text-muted-foreground text-sm">
          Every model call — prompts, output, cost, latency. Retained 30 days.
        </p>
      </div>

      {/* Stats strip */}
      <div className="border-border mb-4 rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-3 text-sm">
          <span className="font-semibold">
            ${a.totalUsd.toFixed(4)} <span className="text-muted-foreground font-normal">total</span>
          </span>
          <NativeSelect
            aria-label="Stats window"
            size="sm"
            value={String(a.windowDays)}
            onChange={(e) => a.setWindowDays(Number(e.target.value))}
          >
            <NativeSelectOption value="7">7 days</NativeSelectOption>
            <NativeSelectOption value="30">30 days</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
          {a.stats.map((s) => (
            <span key={`${s.label}-${s.model}`} className="text-muted-foreground">
              {s.label}/{s.model}: {s.count}× ${(s.costUsd ?? 0).toFixed(4)}
            </span>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-3 flex items-center gap-3">
        <NativeSelect
          aria-label="Call site"
          value={a.label}
          onChange={(e) => a.setLabel(e.target.value)}
        >
          {SITES.map((s) => (
            <NativeSelectOption key={s || "all"} value={s}>
              {s === "" ? "all call-sites" : s}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={a.errorsOnly}
            onChange={(e) => a.setErrorsOnly(e.target.checked)}
          />
          errors only
        </label>
      </div>

      {a.loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : a.calls.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No calls match." description="Try a different call-site or clear the errors filter." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>time</TableHead>
                <TableHead>call-site</TableHead>
                <TableHead>model</TableHead>
                <TableHead>tok</TableHead>
                <TableHead>$</TableHead>
                <TableHead>ms</TableHead>
                <TableHead className="w-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.calls.map((c) => {
                const key = String(c.id ?? c.ts)
                const open = openId === key
                return (
                  <Fragment key={key}>
                    <TableRow>
                      <TableCell className="font-mono text-xs">{c.ts?.slice(11, 19)}</TableCell>
                      <TableCell>
                        <Badge variant={c.error ? "destructive" : "secondary"}>{c.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate">{c.model}</TableCell>
                      <TableCell className="font-mono text-xs">{c.inTokens}→{c.outTokens}</TableCell>
                      <TableCell className="font-mono text-xs">{(c.costUsd ?? 0).toFixed(4)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.latencyMs}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" aria-label={`Inspect ${key}`} onClick={() => setOpenId(open ? null : key)}>
                          {open ? "×" : "inspect"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex flex-col gap-3 py-2">
                            {c.error ? <div className="text-destructive text-sm">error: {c.error}</div> : null}
                            <Section title="system" body={c.systemPrompt ?? ""} />
                            <Section title="user" body={c.userPrompt ?? ""} />
                            <Section title="output" body={c.output ?? ""} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>

          <nav aria-label="Pagination" className="text-muted-foreground mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={a.page === 0} onClick={() => a.setPage(a.page - 1)}>Prev</Button>
              <span>Page {a.page + 1} / {pageCount}</span>
              <Button variant="outline" size="sm" disabled={a.page >= pageCount - 1} onClick={() => a.setPage(a.page + 1)}>Next</Button>
            </div>
            <span>rows {from}–{to} of {a.total}</span>
          </nav>
        </>
      )}
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs uppercase">{title}</div>
      <pre className="bg-muted max-h-64 overflow-auto whitespace-pre-wrap rounded p-2 font-mono text-xs">{body}</pre>
    </div>
  )
}
