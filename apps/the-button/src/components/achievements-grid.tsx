import { useState } from "react"
import type { CatalogEntry } from "../lib/catalog"
import { achievementMeta } from "../lib/achievement-meta"

function AchievementCard({
  entry,
  variant,
}: {
  entry: CatalogEntry
  variant: "featured" | "achieved" | "next" | "locked"
}) {
  const { emoji, requirement } = achievementMeta(entry.id)
  const unlocked = variant === "featured" || variant === "achieved"
  const badge = variant === "featured" ? "YOUR HIGHEST RANK" : variant === "next" ? "NEXT TARGET" : null
  return (
    <li
      className={
        "tb-box tb-card flex gap-4 p-5 text-left " +
        (variant === "featured"
          ? "tb-achieved tb-featured"
          : variant === "achieved"
            ? "tb-achieved"
            : variant === "next"
              ? "tb-next"
              : "tb-locked")
      }
    >
      <div className="tb-emoji flex shrink-0 items-center text-4xl leading-none">
        {unlocked ? emoji : "🔒"}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {badge && (
          <div className="text-primary text-[0.65rem] font-bold tracking-widest uppercase">{badge}</div>
        )}
        <div className={"font-bold tracking-wide " + (unlocked ? "text-primary" : "text-muted-foreground")}>
          {unlocked ? entry.title : "???"}
        </div>
        <div className={"text-sm leading-snug " + (unlocked ? "text-foreground italic" : "text-muted-foreground")}>
          {unlocked ? entry.description : "Keep clicking to unlock…"}
        </div>
        {requirement && (
          <div
            className={
              "mt-1 text-[0.7rem] tracking-wider uppercase " +
              (unlocked ? "text-primary" : "text-muted-foreground")
            }
          >
            {requirement}
          </div>
        )}
      </div>
    </li>
  )
}

export function AchievementsGrid({ entries }: { entries: CatalogEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const unlockedCount = entries.filter(e => e.unlockedAt).length
  const highestIdx = entries.map(e => Boolean(e.unlockedAt)).lastIndexOf(true)
  const nextId = entries.find(e => !e.unlockedAt)?.id

  const variantOf = (entry: CatalogEntry, i: number): "featured" | "achieved" | "next" | "locked" => {
    if (i === highestIdx) return "featured"
    if (entry.unlockedAt) return "achieved"
    if (entry.id === nextId) return "next"
    return "locked"
  }

  // Collapsed: show the featured + next-target cards only.
  const visible = expanded
    ? entries
    : entries.filter((e, i) => i === highestIdx || e.id === nextId)

  return (
    <section aria-label="achievements" className="border-border w-full max-w-3xl border-b pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-muted-foreground font-mono text-sm">{"// your achievements"}</h2>
        <div className="flex items-center gap-4">
          <span className="text-primary font-mono text-sm font-bold tabular-nums">
            {unlockedCount}/{entries.length}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="border-border text-muted-foreground hover:border-primary hover:text-primary border px-3 py-1.5 font-mono text-xs tracking-wider transition-colors"
          >
            {expanded ? "▲ HIDE" : "▼ VIEW ALL"}
          </button>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map(entry => (
          <AchievementCard key={entry.id} entry={entry} variant={variantOf(entry, entries.indexOf(entry))} />
        ))}
      </ul>
    </section>
  )
}
