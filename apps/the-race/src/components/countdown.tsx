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
      {/* Keyed on the label so every new digit restarts the ripple. */}
      <span key={label} className="relative inline-flex">
        {/* The ripple rides on a ghost layer and never on the digit itself.
            Tailwind's ping keyframes end at opacity 0, so a digit wearing this
            animation ripples out to invisible over 400ms and then hard-pops
            back to solid for the rest of its slot — four times, in the one beat
            whose entire job is to create a sense of occasion. */}
        <span
          aria-hidden
          className="absolute inset-0 flex animate-[ping_0.4s_ease-out_1] items-center justify-center font-black text-6xl text-[#00E07A]"
        >
          {label}
        </span>
        <span className="relative font-black text-6xl text-white drop-shadow-[0_0_24px_rgba(0,224,122,0.55)]">
          {label}
        </span>
      </span>
    </div>
  )
}
