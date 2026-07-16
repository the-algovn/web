export function MilestoneBanner({
  milestone,
}: {
  milestone: { threshold: number; title: string } | null
}) {
  if (!milestone) return null
  return (
    <div
      role="status"
      className="tb-box border-primary text-primary w-full max-w-3xl px-4 py-2 text-left font-mono text-sm [box-shadow:0_0_15px_rgba(0,255,136,0.15)]"
    >
      <span className="text-muted-foreground">{"// milestone "}</span>
      {milestone.threshold.toLocaleString("en-US")} clicks — {milestone.title}
    </div>
  )
}
