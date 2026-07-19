import type { QuestProgress } from "../lib/api"

function QuestRow({ quest }: { quest: QuestProgress }) {
  const pct = quest.target > 0 ? Math.min(100, (quest.progress / quest.target) * 100) : 0
  return (
    <li className={"tb-box tb-card flex flex-col gap-2 p-4 text-left " + (quest.done ? "tb-achieved" : "")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-primary font-bold tracking-wide">{quest.title}</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {quest.progress}/{quest.target}
        </span>
      </div>
      <p className="text-foreground text-sm leading-snug italic">{quest.description}</p>
      <div className="bg-border h-1 w-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-primary h-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-muted-foreground flex items-center justify-between font-mono text-[0.7rem] tracking-wider uppercase">
        <span>{quest.done ? "✓ complete" : "in progress"}</span>
        <span>{quest.reward}</span>
      </div>
    </li>
  )
}

export function GoalsPanel({
  quests,
  streak,
}: {
  quests: QuestProgress[]
  streak: { current: number; best: number; lastDay: string }
}) {
  const daily = quests.filter((q) => q.kind === "daily")
  const weekly = quests.filter((q) => q.kind === "weekly")

  return (
    <section aria-label="streak and quests" className="tb-box p-4 text-left">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-muted-foreground font-mono text-sm">{"// streak & quests"}</h2>
        <span className="tb-chip tb-chip-streak">
          🔥 <b>{streak.current}</b>d
          <span className="text-muted-foreground">best {streak.best}d</span>
        </span>
      </div>

      {quests.length === 0 ? (
        <p className="text-muted-foreground font-mono text-xs">loading your goals…</p>
      ) : (
        <>
          {daily.length > 0 && (
            <div className="mb-4">
              <h3 className="text-muted-foreground mb-2 font-mono text-xs tracking-wider uppercase">daily</h3>
              <ul className="flex flex-col gap-3">
                {daily.map((quest) => (
                  <QuestRow key={quest.id} quest={quest} />
                ))}
              </ul>
            </div>
          )}
          {weekly.length > 0 && (
            <div>
              <h3 className="text-muted-foreground mb-2 font-mono text-xs tracking-wider uppercase">weekly</h3>
              <ul className="flex flex-col gap-3">
                {weekly.map((quest) => (
                  <QuestRow key={quest.id} quest={quest} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
