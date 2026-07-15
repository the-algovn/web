export const WHY = [
  "stress-testing a home server",
  "proving humans can work together",
  "because the internet needs more joy",
  "every click is a tiny rebellion",
] as const

export function WhyGrid() {
  return (
    <section aria-label="why" className="w-full max-w-3xl text-left">
      <h2 className="text-muted-foreground mb-3 font-mono text-sm">{"// why?"}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {WHY.map((reason, i) => (
          <li
            key={reason}
            className="border-border bg-card flex items-start gap-3 rounded-md border p-3"
          >
            <span className="text-primary font-mono text-xs tabular-nums">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <span className="text-muted-foreground text-sm">{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
