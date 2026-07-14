import { Badge } from "@algovn/ui/badge"
import { cn } from "@algovn/ui/lib/utils"

export function ClickButton({
  onMash,
  myTotal,
  pending,
}: {
  onMash: () => void
  myTotal: number | null
  pending: number
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onMash}
        className={cn(
          "bg-primary text-primary-foreground size-40 rounded-full text-xl font-semibold shadow-lg sm:size-48",
          "transition-transform duration-75 select-none active:scale-90",
          "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
        )}
      >
        the button
      </button>
      <div className="flex min-h-6 items-center gap-2 text-sm">
        {myTotal !== null && (
          <span className="text-muted-foreground">
            you:{" "}
            <span className="text-foreground font-mono tabular-nums">
              {(myTotal + pending).toLocaleString("en-US")}
            </span>
          </span>
        )}
        {pending > 0 && (
          <Badge variant="secondary">{pending.toLocaleString("en-US")} pending</Badge>
        )}
      </div>
    </div>
  )
}
