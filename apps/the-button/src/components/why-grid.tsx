import { Section } from "./section"

export const WHY = [
  "stress-testing a home server",
  "proving humans can work together",
  "because the internet needs more joy",
  "every click is a tiny rebellion",
] as const

export function WhyGrid() {
  return (
    <Section label="why" title="// why?" variant="plain">
      <ul className="grid gap-2 sm:grid-cols-2">
        {WHY.map((reason, i) => (
          <li
            key={reason}
            className="tb-box hover:border-primary flex items-start gap-3 p-3 transition-colors"
          >
            <span className="text-primary font-mono text-xs tabular-nums">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <span className="text-muted-foreground text-sm">{reason}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
