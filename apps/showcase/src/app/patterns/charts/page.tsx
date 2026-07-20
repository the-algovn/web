import { PageHeader } from "@algovn/ui/page-header"
import {
  AreaDemo,
  BarDemo,
  LineDemo,
  PieDemo,
  RadialDemo,
} from "@/components/charts"

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Charts"
        description="shadcn charts on Recharts, wired to --chart-1…6 tokens."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <LineDemo />
        <AreaDemo />
        <BarDemo />
        <PieDemo />
        <RadialDemo />
      </div>
    </div>
  )
}
