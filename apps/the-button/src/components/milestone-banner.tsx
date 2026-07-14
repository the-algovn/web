import { PartyPopperIcon } from "lucide-react"

export function MilestoneBanner({
  milestone,
}: {
  milestone: { threshold: number; title: string } | null
}) {
  if (!milestone) return null
  return (
    <div
      role="status"
      className="bg-primary/10 text-primary border-primary/30 flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
    >
      <PartyPopperIcon className="size-4 shrink-0" />
      <span>
        {milestone.threshold.toLocaleString("en-US")} clicks — {milestone.title}
      </span>
    </div>
  )
}
