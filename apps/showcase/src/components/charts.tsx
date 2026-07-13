"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
} from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@algovn/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@algovn/ui/card"

const monthly = [
  { month: "Jan", pnl: 1860, volume: 800 },
  { month: "Feb", pnl: 3050, volume: 1200 },
  { month: "Mar", pnl: 2370, volume: 990 },
  { month: "Apr", pnl: 730, volume: 1500 },
  { month: "May", pnl: 2090, volume: 1300 },
  { month: "Jun", pnl: 2140, volume: 1100 },
]

const seriesConfig = {
  pnl: { label: "P&L", color: "var(--chart-1)" },
  volume: { label: "Volume", color: "var(--chart-2)" },
} satisfies ChartConfig

const strategies = [
  { name: "momentum", share: 275, fill: "var(--chart-1)" },
  { name: "meanrev", share: 200, fill: "var(--chart-2)" },
  { name: "arb", share: 187, fill: "var(--chart-3)" },
  { name: "market", share: 173, fill: "var(--chart-4)" },
  { name: "other", share: 90, fill: "var(--chart-5)" },
]

const strategyConfig = {
  share: { label: "Share" },
  momentum: { label: "Momentum", color: "var(--chart-1)" },
  meanrev: { label: "Mean reversion", color: "var(--chart-2)" },
  arb: { label: "Arbitrage", color: "var(--chart-3)" },
  market: { label: "Market making", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function LineDemo() {
  return (
    <ChartCard title="Line">
      <ChartContainer config={seriesConfig} className="h-64 w-full">
        <LineChart data={monthly} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line dataKey="pnl" type="monotone" stroke="var(--color-pnl)" strokeWidth={2} dot={false} />
          <Line dataKey="volume" type="monotone" stroke="var(--color-volume)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function AreaDemo() {
  return (
    <ChartCard title="Area">
      <ChartContainer config={seriesConfig} className="h-64 w-full">
        <AreaChart data={monthly} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area dataKey="pnl" type="natural" fill="var(--color-pnl)" fillOpacity={0.3} stroke="var(--color-pnl)" />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function BarDemo() {
  return (
    <ChartCard title="Bar">
      <ChartContainer config={seriesConfig} className="h-64 w-full">
        <BarChart data={monthly}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="pnl" fill="var(--color-pnl)" radius={4} />
          <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function PieDemo() {
  return (
    <ChartCard title="Donut">
      <ChartContainer config={strategyConfig} className="mx-auto h-64 w-full max-w-64">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie data={strategies} dataKey="share" nameKey="name" innerRadius={60} />
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function RadialDemo() {
  return (
    <ChartCard title="Radial">
      <ChartContainer config={strategyConfig} className="mx-auto h-64 w-full max-w-64">
        <RadialBarChart data={strategies} innerRadius={30} outerRadius={110}>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <RadialBar dataKey="share" background />
        </RadialBarChart>
      </ChartContainer>
    </ChartCard>
  )
}
