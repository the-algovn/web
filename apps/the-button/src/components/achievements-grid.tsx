import { LockIcon, TrophyIcon } from "lucide-react"
import { Card, CardContent } from "@algovn/ui/card"
import { cn } from "@algovn/ui/lib/utils"
import type { CatalogEntry } from "../lib/catalog"

export function AchievementsGrid({ entries }: { entries: CatalogEntry[] }) {
  const unlockedCount = entries.filter(e => e.unlockedAt).length
  const nextId = entries.find(e => !e.unlockedAt)?.id
  return (
    <section aria-label="achievements" className="w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-left text-sm font-medium">achievements</h2>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {unlockedCount}/{entries.length}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(entry => {
          const unlocked = Boolean(entry.unlockedAt)
          const isNext = entry.id === nextId
          return (
            <li key={entry.id}>
              <Card
                data-unlocked={unlocked}
                className={cn(
                  "h-full",
                  !unlocked && "opacity-60",
                  isNext && "border-primary/50 opacity-100"
                )}
              >
                <CardContent className="space-y-1.5 p-4 text-left">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {unlocked ? (
                      <TrophyIcon className="text-primary size-4 shrink-0" />
                    ) : (
                      <LockIcon className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <span>{entry.title}</span>
                    {isNext && (
                      <span className="text-primary ml-auto font-mono text-[0.6rem] tracking-widest">
                        NEXT
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">{entry.description}</p>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
