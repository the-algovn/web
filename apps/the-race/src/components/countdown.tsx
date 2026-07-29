import { countdownLabel } from "../lib/broadcast"

/** Three, two, one, go — over the lanes, and silent. */
export function Countdown({ localMs }: { localMs: number }) {
  const label = countdownLabel(localMs)
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        key={label}
        className="animate-[ping_0.4s_ease-out_1] font-black text-6xl text-white drop-shadow-[0_0_24px_rgba(0,224,122,0.55)]"
      >
        {label}
      </span>
    </div>
  )
}
