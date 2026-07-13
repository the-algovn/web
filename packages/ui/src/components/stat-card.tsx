import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { Card, CardContent } from "@algovn/ui/card"
import { cn } from "@algovn/ui/lib/utils"

export interface StatCardProps {
  title: string
  value: string
  delta?: { value: string; direction: "up" | "down" | "flat" }
  description?: string
  icon?: React.ReactNode
  className?: string
}

const deltaStyles = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
} as const

const deltaIcons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const

export function StatCard({ title, value, delta, description, icon, className }: StatCardProps) {
  const DeltaIcon = delta ? deltaIcons[delta.direction] : null
  return (
    <Card className={className}>
      <CardContent className="space-y-1.5 p-6">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>{title}</span>
          {icon ? <span className="[&>svg]:size-4">{icon}</span> : null}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
          {delta && DeltaIcon ? (
            <span className={cn("flex items-center gap-0.5 text-sm font-medium", deltaStyles[delta.direction])}>
              <DeltaIcon className="size-3.5" />
              {delta.value}
            </span>
          ) : null}
        </div>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </CardContent>
    </Card>
  )
}
