import { Activity, ArrowRight, Cpu, Timer, Wallet } from "lucide-react"
import Link from "next/link"
import { Button } from "@algovn/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@algovn/ui/card"
import { PageHeader } from "@algovn/ui/page-header"
import { StatCard } from "@algovn/ui/stat-card"

const sections = [
  { title: "Buttons", href: "/components/buttons", blurb: "Variants, sizes, states" },
  { title: "Inputs", href: "/components/inputs", blurb: "Text, select, date, combobox" },
  { title: "Overlays", href: "/components/overlays", blurb: "Dialogs, sheets, menus" },
  { title: "Navigation", href: "/components/navigation", blurb: "Tabs, breadcrumbs, pagination" },
  { title: "Data Display", href: "/components/data-display", blurb: "Cards, tables, accordions" },
  { title: "Feedback", href: "/components/feedback", blurb: "Alerts, toasts, progress" },
  { title: "Composites", href: "/components/composites", blurb: "PageHeader, EmptyState, StatCard" },
  { title: "Forms", href: "/patterns/forms", blurb: "RHF + zod recipes" },
  { title: "Charts", href: "/patterns/charts", blurb: "Line, area, bar, pie, radial" },
  { title: "Data Table", href: "/patterns/data-table", blurb: "Sort, filter, paginate" },
]

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="algovn design system"
        description="Dark-first, instrument-panel UI kit for algovn SaaS apps."
        actions={
          <Button asChild>
            <Link href="/components/buttons">
              Browse components <ArrowRight />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Components" value="50+" icon={<Cpu />} delta={{ value: "all vendored", direction: "flat" }} />
        <StatCard title="P&L" value="$12,430" icon={<Wallet />} delta={{ value: "+8.1%", direction: "up" }} />
        <StatCard title="Latency" value="42ms" icon={<Timer />} delta={{ value: "-3ms", direction: "up" }} />
        <StatCard title="Error rate" value="0.4%" icon={<Activity />} delta={{ value: "+0.1%", direction: "down" }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="group-hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>{s.blurb}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
