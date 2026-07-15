import type { Eta } from "../lib/eta"
import type { LiveMode } from "../lib/liveCounter"

const MODE_TEXT: Record<LiveMode, string> = {
  connecting: "connecting…",
  live: "live",
  polling: "polling",
}

export function StatusBar({ mode, eta }: { mode: LiveMode; eta: Eta }) {
  return (
    <div className="text-muted-foreground border-border flex w-full max-w-3xl items-center justify-between border-b py-2 font-mono text-xs">
      <span>▶ the button</span>
      <span className="flex items-center gap-2">
        <span className={mode === "live" ? "text-primary" : undefined}>● {MODE_TEXT[mode]}</span>
        <span aria-hidden>·</span>
        <span>ETA {eta.text}</span>
      </span>
    </div>
  )
}
