import type { Eta } from "../lib/eta"
import type { LiveMode } from "../lib/liveCounter"

const MODE_TEXT: Record<LiveMode, string> = {
  connecting: "CONNECTING",
  live: "LIVE",
  polling: "POLLING",
}

export function StatusBar({ mode, eta }: { mode: LiveMode; eta: Eta }) {
  const connected = mode === "live"
  return (
    <header className="border-border bg-background sticky top-0 z-20 flex w-full max-w-3xl flex-col gap-2 border-b py-3 font-mono">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-primary [animation:tb-blink_1s_step-end_infinite]">▶</span>
        <span className="text-muted-foreground">~/the-button</span>
        <span
          className={
            "ml-auto border px-2 py-0.5 text-xs " +
            (connected
              ? "border-primary text-primary [animation:tb-pulse_2s_ease-in-out_infinite]"
              : "border-destructive text-destructive [animation:tb-pulse_1s_ease-in-out_infinite]")
          }
        >
          {MODE_TEXT[mode]}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs tracking-wider">ETA:</span>
        <span className="text-primary text-sm font-bold text-balance">{eta.text}</span>
      </div>
    </header>
  )
}
