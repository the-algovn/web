import { useState } from "react"
import type { Row } from "../lib/leaderboardStream"

type Board = "allTime" | "thisWeek"

export function Leaderboard({
  allTime,
  thisWeek,
  myRank,
  myName,
}: {
  allTime: Row[]
  thisWeek: Row[]
  myRank: { allTime?: number; weekly?: number }
  myName: string | null
}) {
  const [board, setBoard] = useState<Board>("allTime")
  const rows = board === "allTime" ? allTime : thisWeek
  const rank = board === "allTime" ? myRank.allTime : myRank.weekly
  const inView = rank !== undefined && rank > 0 && rows.some((r) => r.rank === rank)
  const showPinned = !!myName && rank !== undefined && rank > 0 && !inView

  return (
    <section aria-label="leaderboard" className="border-border w-full max-w-3xl border-b pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-muted-foreground font-mono text-sm">{"// leaderboard"}</h2>
        <div className="flex gap-2">
          <Tab active={board === "allTime"} onClick={() => setBoard("allTime")}>ALL TIME</Tab>
          <Tab active={board === "thisWeek"} onClick={() => setBoard("thisWeek")}>THIS WEEK</Tab>
        </div>
      </div>
      <ol className="tb-box divide-border divide-y">
        {rows.map((r) => (
          <LbRow key={r.rank} rank={r.rank} name={r.name} clicks={r.clicks} you={r.rank === rank} />
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground p-4 text-center font-mono text-sm">no clicks yet</li>
        )}
      </ol>
      {showPinned && (
        <div className="border-primary mt-2 border-l-[3px]">
          <LbRow rank={rank!} name={myName!} clicks={undefined} you />
        </div>
      )}
    </section>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border px-3 py-1.5 font-mono text-xs tracking-wider transition-colors " +
        (active
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary")
      }
    >
      {children}
    </button>
  )
}

function LbRow({
  rank,
  name,
  clicks,
  you,
}: {
  rank: number
  name: string
  clicks: number | undefined
  you: boolean
}) {
  return (
    <div className={"flex items-center justify-between p-3 " + (you ? "text-primary font-bold" : "")}>
      <span className="flex items-center gap-3">
        <span className="text-muted-foreground w-10 font-mono text-sm tabular-nums">#{rank}</span>
        <span className="font-mono text-sm">{name}</span>
      </span>
      <span className="font-mono text-sm tabular-nums">
        {clicks === undefined ? "" : clicks.toLocaleString("en-US")}
      </span>
    </div>
  )
}
