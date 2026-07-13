"use client"

import {
  BarChart3,
  FileInput,
  Home,
  Layers,
  LayoutList,
  MessageSquare,
  MousePointerClick,
  Navigation,
  PanelTop,
  Table,
} from "lucide-react"
import { AppShell, type AppShellNavGroup } from "@algovn/ui/app-shell"
import { ThemeToggle } from "@algovn/ui/theme-toggle"

const navigation: AppShellNavGroup[] = [
  { label: "Overview", items: [{ title: "Home", href: "/", icon: Home }] },
  {
    label: "Components",
    items: [
      { title: "Buttons", href: "/components/buttons", icon: MousePointerClick },
      { title: "Inputs", href: "/components/inputs", icon: FileInput },
      { title: "Overlays", href: "/components/overlays", icon: PanelTop },
      { title: "Navigation", href: "/components/navigation", icon: Navigation },
      { title: "Data Display", href: "/components/data-display", icon: LayoutList },
      { title: "Feedback", href: "/components/feedback", icon: MessageSquare },
      { title: "Composites", href: "/components/composites", icon: Layers },
    ],
  },
  {
    label: "Patterns",
    items: [
      { title: "Forms", href: "/patterns/forms", icon: FileInput },
      { title: "Charts", href: "/patterns/charts", icon: BarChart3 },
      { title: "Data Table", href: "/patterns/data-table", icon: Table },
    ],
  },
]

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      brand={<span className="font-mono text-sm font-semibold tracking-tight">algovn/ui</span>}
      navigation={navigation}
      headerRight={<ThemeToggle />}
    >
      {children}
    </AppShell>
  )
}
