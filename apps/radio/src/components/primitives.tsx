import type { ReactNode } from "react"

// The deck's section marker: 9.5px mono, wide tracking, upper case. It
// appears roughly twenty times across the three views, so it is a component
// rather than a repeated class string.
export function Eyebrow({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode
  tone?: "muted" | "air"
  className?: string
}) {
  return (
    <span
      className={`radio-mono text-[9.5px] font-bold tracking-[0.16em] ${className ?? ""}`}
      style={{
        color: tone === "air" ? "var(--radio-air)" : "var(--radio-ink-55)",
      }}
    >
      {children}
    </span>
  )
}

// Cover art, or the diagonal weave that stands in for it. The weave is drawn
// rather than shipped as an image so it costs nothing and scales to any tile.
export function TrackArt({
  src,
  size,
  label,
  className,
}: {
  src?: string
  size: number
  label?: string
  className?: string
}) {
  const stripe = Math.max(4, Math.round(size / 23))
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-end border p-[7px] ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderColor: "var(--radio-line-firm)",
        background: src
          ? `center/cover url(${src})`
          : `repeating-linear-gradient(135deg,var(--radio-surface) 0 ${stripe}px,var(--radio-surface-alt) ${stripe}px ${stripe * 2}px)`,
      }}
    >
      {!src && label && (
        <span
          className="radio-mono text-[9px] leading-[1.2] tracking-[0.05em]"
          style={{ color: "var(--radio-ink-50)" }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

// A dedication, quoted. The accent rule down the left is what separates a
// listener's words from the station's own copy everywhere they appear.
export function DedicationQuote({
  message,
  attribution,
}: {
  message: string
  attribution?: string
}) {
  return (
    <div
      className="mt-1.5 flex flex-col gap-1.5 pl-3"
      style={{ borderLeft: "2px solid var(--radio-air-dim)" }}
    >
      <p
        className="text-[14.5px] leading-[1.5] text-pretty"
        style={{ color: "var(--radio-ink-92)" }}
      >
        {message}
      </p>
      {attribution && (
        <span
          className="radio-mono text-[10.5px] leading-[1.4]"
          style={{ color: "var(--radio-ink-55)" }}
        >
          {attribution}
        </span>
      )}
    </div>
  )
}

// The deck has exactly one filled button style and one outlined one. Both are
// square, both are mono, both keep a 44px touch target.
export function AirButton({
  children,
  onClick,
  variant = "solid",
  disabled,
  type = "button",
  className,
  ...rest
}: {
  children: ReactNode
  onClick?(): void
  variant?: "solid" | "outline"
  disabled?: boolean
  type?: "button" | "submit"
  className?: string
} & { "aria-label"?: string }) {
  const solid = variant === "solid"
  return (
    <button
      type={type === "submit" ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className={`radio-mono flex min-h-11 items-center justify-center gap-2.5 px-4 text-[11.5px] font-bold tracking-[0.14em] transition disabled:cursor-not-allowed ${className ?? ""}`}
      style={{
        background: solid
          ? disabled
            ? "rgb(232 233 230 / 0.14)"
            : "var(--radio-air)"
          : "transparent",
        color: solid
          ? disabled
            ? "var(--radio-ink-50)"
            : "var(--radio-deep)"
          : "var(--radio-ink)",
        border: solid ? "none" : "1px solid var(--radio-line-loud)",
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
