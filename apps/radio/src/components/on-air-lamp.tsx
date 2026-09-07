import type { StationStatus } from "../lib/station-state"

const LABEL: Record<StationStatus, string> = {
  connecting: "TUNING…",
  "on-air": "ON AIR",
  "music-only": "MUSIC ONLY",
  "off-air": "OFF AIR",
}

// Four bars, four durations, four offsets. Deliberately co-prime-ish so the
// meter never settles into a visible loop the way a single shared duration
// would.
const BARS = [
  { duration: "0.62s", delay: "0s" },
  { duration: "0.46s", delay: "-0.2s" },
  { duration: "0.78s", delay: "-0.35s" },
  { duration: "0.54s", delay: "-0.1s" },
]

// The station's pulse. It moves only while audio is actually going out; a
// meter that keeps dancing off air would be lying about the signal.
export function OnAirLamp({
  status,
  className,
}: {
  status: StationStatus
  className?: string
}) {
  const live = status === "on-air" || status === "music-only"
  const color = status === "off-air" ? "var(--radio-ink-50)" : "var(--radio-air)"

  return (
    <span className={`inline-flex items-center gap-[7px] ${className ?? ""}`}>
      <span aria-hidden className="flex h-[15px] items-end gap-[2px]">
        {BARS.map((bar) => (
          <span
            key={bar.duration}
            className="radio-meter-bar w-[2px] origin-bottom"
            style={{
              height: 15,
              background: color,
              boxShadow:
                status === "off-air" ? "none" : "var(--radio-air-glow-soft)",
              transform: live ? undefined : "scaleY(0.2)",
              animation: live
                ? `radio-meter ${bar.duration} ease-in-out ${bar.delay} infinite alternate`
                : undefined,
            }}
          />
        ))}
      </span>
      <span
        className="radio-mono text-[9.5px] font-bold tracking-[0.14em]"
        style={{ color }}
      >
        {LABEL[status]}
      </span>
    </span>
  )
}
