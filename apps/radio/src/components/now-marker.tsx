import { mmss } from "../lib/format"

// The pivot of the time axis: everything above is still to come, everything
// below has aired.
export function NowMarker({
  elapsedS,
  remainingS,
}: {
  elapsedS: number
  remainingS: number
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        background: "color-mix(in srgb, var(--radio-amber) 6%, transparent)",
        borderTop: "1px solid color-mix(in srgb, var(--radio-amber) 28%, transparent)",
        borderBottom:
          "1px solid color-mix(in srgb, var(--radio-amber) 28%, transparent)",
      }}
    >
      <span
        aria-hidden
        className="radio-pulse size-1.5 rounded-full"
        style={{ background: "var(--radio-air)", boxShadow: "0 0 7px var(--radio-air)" }}
      />
      <b
        className="font-mono text-[10px] tracking-[0.14em]"
        style={{ color: "var(--radio-amber)" }}
      >
        ĐANG PHÁT
      </b>
      <span className="ml-auto font-mono text-[10px] text-[color:var(--muted-foreground)]">
        {mmss(elapsedS)} / {mmss(elapsedS + remainingS)}
      </span>
    </div>
  )
}
