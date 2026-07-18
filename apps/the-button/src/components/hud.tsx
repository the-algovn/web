import type { LiveMode } from "../lib/liveCounter"

const MODE_TEXT: Record<LiveMode, string> = {
  connecting: "CONNECTING",
  live: "LIVE",
  polling: "POLLING",
}

export function Hud({
  mode,
  level,
  streakDays,
  rank,
}: {
  mode: LiveMode
  level: number
  streakDays: number | null
  rank: number | null
}) {
  const live = mode === "live"
  return (
    <header className="tb-hud">
      <div className="tb-brand">
        <h1 className="tb-logo">THE BUTTON.</h1>
        <span className="tb-tag">{"// one button · one goal · millions of humans"}</span>
      </div>
      <div className="tb-chips" aria-live="polite">
        <span className={"tb-chip " + (live ? "tb-chip-live" : "tb-chip-off")}>
          <i className="tb-dot" aria-hidden />
          {MODE_TEXT[mode]}
        </span>
        <span className="tb-chip">
          LVL <b>{level}</b>
        </span>
        {streakDays !== null && (
          <span className="tb-chip tb-chip-streak">
            🔥 <b>{streakDays}</b>d
          </span>
        )}
        {rank !== null && rank > 0 && (
          <span className="tb-chip tb-chip-rank">
            RANK <b>#{rank.toLocaleString("en-US")}</b>
          </span>
        )}
      </div>
    </header>
  )
}
