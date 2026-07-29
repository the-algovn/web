/**
 * The broadcast furniture: what is on air, how far in, and the credential that
 * says the result was fixed before anyone watched.
 *
 * The seal is stated rather than hidden behind a padlock glyph, because the
 * commit–reveal proof is the product's central claim and a lock in a corner
 * reads as boilerplate.
 */
export function Chrome({
  title,
  seedCommit,
  live,
  tMs,
  durationMs,
  caption,
  muted,
  voiced,
  showClock,
  onToggleMute,
}: {
  title: string
  seedCommit: string
  live: boolean
  tMs: number
  durationMs: number
  caption: string
  muted: boolean
  voiced: number
  /** False before the gun: there is nothing to time yet. */
  showClock: boolean
  onToggleMute: () => void
}) {
  const progress = durationMs > 0 ? Math.min(1, tMs / durationMs) : 0

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {live && (
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-[#00E07A]" />
              <span className="font-bold text-[#00E07A] text-[11px] tracking-[0.18em]">
                LIVE
              </span>
            </span>
          )}
          <h1 className="truncate font-semibold text-base text-white/90">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {voiced > 0 && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
              aria-pressed={muted}
              className="rounded px-1.5 py-0.5 text-white/50 text-xs hover:text-white"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          )}
          {showClock && (
            <span className="font-mono text-sm text-white/70 tabular-nums">
              {(tMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </header>

      {/* Gated with the clock, and for the same reason: a bar announcing "Tiến độ
          cuộc đua, 0%" through the whole pre-race claims a race is under way and
          nobody has moved. */}
      {showClock && (
        <div
          className="h-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Tiến độ cuộc đua"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full bg-[#00E07A] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div
        className="min-h-11 rounded-md border border-white/5 bg-black/40 px-3 py-2 text-sm text-white/90"
        aria-live="polite"
      >
        {caption ? <span>🎙 {caption}</span> : <span className="text-white/25">…</span>}
      </div>

      <p className="text-[11px] text-white/35">
        <span className="font-semibold text-[#00E07A]">✓ ĐÃ NIÊM PHONG</span>{" "}
        <span className="font-mono">{seedCommit.slice(0, 8)}</span> — kết quả được
        chốt trước khi đua
      </p>
    </>
  )
}
