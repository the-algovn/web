import type { ReactNode } from "react"
import { Button } from "@algovn/ui/button"

// Shared bench chrome: form area, run button, result area, cost chip.
export function RunPanel(props: {
  title: string
  description?: string
  form: ReactNode
  result?: ReactNode
  running: boolean
  costUsd?: number
  onRun: () => void
  runLabel?: string
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">{props.title}</h1>
        {props.description ? <p className="text-muted-foreground text-sm">{props.description}</p> : null}
      </div>
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">{props.form}</div>
      <div className="flex items-center gap-3">
        <Button onClick={props.onRun} disabled={props.running}>
          {props.running ? "Running…" : (props.runLabel ?? "Run")}
        </Button>
        {props.costUsd !== undefined ? (
          <span className="text-muted-foreground font-mono text-xs">${props.costUsd.toFixed(4)}</span>
        ) : null}
      </div>
      {props.result ? <div className="border-border rounded-lg border p-4">{props.result}</div> : null}
    </div>
  )
}
