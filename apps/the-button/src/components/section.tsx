import type { ReactNode } from "react"

// The one section chrome for the whole page: same aria-label + `// title`
// header row + width/spacing everywhere. `variant="plain"` skips the box for
// sections whose children are already cards or lists (why, achievements,
// leaderboard) so we never nest boxes in boxes.
export function Section({
  label,
  title,
  headerRight,
  variant = "box",
  className = "",
  children,
}: {
  label: string
  title: string
  headerRight?: ReactNode
  variant?: "box" | "plain"
  className?: string
  children: ReactNode
}) {
  const box = variant === "box" ? "tb-box p-4 " : ""
  return (
    <section
      aria-label={label}
      className={`${box}w-full text-left ${className}`.trim()}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground font-mono text-sm">{title}</h2>
        {headerRight}
      </div>
      {children}
    </section>
  )
}
