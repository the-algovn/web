import type { StationStatus } from "../lib/station-state"

const LABEL: Record<StationStatus, string> = {
  connecting: "TUNING…",
  "on-air": "ON AIR",
  "music-only": "MUSIC ONLY",
  "off-air": "OFF AIR",
}

export function OnAirLamp({ status }: { status: StationStatus }) {
  const lit = status === "on-air"
  const dim = status === "music-only" || status === "connecting"
  const color =
    status === "off-air" ? "var(--muted-foreground)" : "var(--radio-air)"
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.12em]"
      style={{
        borderColor: "color-mix(in srgb, var(--radio-air) 35%, transparent)",
        color,
      }}
    >
      <span
        aria-hidden
        className={lit ? "radio-pulse" : undefined}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow:
            status === "off-air"
              ? "none"
              : `0 0 8px 2px ${dim ? "color-mix(in srgb, var(--radio-air) 50%, transparent)" : "var(--radio-air)"}`,
        }}
      />
      {LABEL[status]}
    </span>
  )
}
