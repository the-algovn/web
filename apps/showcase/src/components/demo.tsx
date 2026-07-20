import { cn } from "@algovn/ui/lib/utils"

export function Demo({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-lg border p-6",
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}
