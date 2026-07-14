import { LockIcon, TrophyIcon } from "lucide-react"
import { Card, CardContent } from "@algovn/ui/card"
import { cn } from "@algovn/ui/lib/utils"
import type { CatalogEntry } from "../lib/catalog"

export function AchievementsGrid({ entries }: { entries: CatalogEntry[] }) {
  return (
    <section aria-label="achievements" className="w-full max-w-3xl">
      <h2 className="text-muted-foreground mb-3 text-left text-sm font-medium">achievements</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(entry => {
          const unlocked = Boolean(entry.unlockedAt)
          return (
            <li key={entry.id}>
              <Card data-unlocked={unlocked} className={cn("h-full", !unlocked && "opacity-60")}>
                <CardContent className="space-y-1.5 p-4 text-left">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {unlocked ? (
                      <TrophyIcon className="text-primary size-4 shrink-0" />
                    ) : (
                      <LockIcon className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <span>{entry.title}</span>
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
