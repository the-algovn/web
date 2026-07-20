export function XpBar({
  level,
  pct,
  xpIntoLevel,
  xpForNext,
}: {
  level: number
  pct: number
  xpIntoLevel: number
  xpForNext: number
}) {
  return (
    <div className="tb-xp w-full">
      <div className="tb-xp-lab">
        <span>
          LVL {level} → {level + 1}
        </span>
        <span className="tabular-nums">
          {xpIntoLevel.toLocaleString("en-US")} /{" "}
          {xpForNext.toLocaleString("en-US")} XP
        </span>
      </div>
      <div className="tb-xp-track">
        <i data-testid="xp-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
