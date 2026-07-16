import { useCallback, useEffect, useState } from "react"
import { Button } from "@algovn/ui/button"
import { labCall } from "../lib/api"

interface LedgerLine {
  ts?: string; kind?: string; provider?: string; label?: string
  chars?: number; inTokens?: number; outTokens?: number; costUsd?: number
}
interface GetLedgerResponse { lines?: LedgerLine[]; totalUsd?: number }

export function LedgerDrawer({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<GetLedgerResponse>({})
  const refresh = useCallback(() => {
    labCall<GetLedgerResponse>(token, "/ledger").then(setData).catch(() => setData({}))
  }, [token])
  useEffect(() => { if (open) refresh() }, [open, refresh])
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>
        Ledger {data.totalUsd !== undefined ? `$${data.totalUsd.toFixed(3)}` : ""}
      </Button>
      {open ? (
        <div className="border-border bg-background absolute right-4 top-14 z-50 max-h-96 w-[28rem] overflow-auto rounded-lg border p-3 shadow-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead><tr className="text-muted-foreground"><th>time</th><th>what</th><th>label</th><th className="text-right">$</th></tr></thead>
            <tbody>
              {(data.lines ?? []).slice().reverse().map((l, i) => (
                <tr key={i}>
                  <td>{l.ts?.slice(11, 19)}</td>
                  <td>{l.kind}/{l.provider}</td>
                  <td className="max-w-40 truncate">{l.label}</td>
                  <td className="text-right">{(l.costUsd ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}
