import type { LucideIcon } from "lucide-react"
import type { ComponentType } from "react"

export interface ConsoleModule {
  id: string // kebab-case, used in location.hash
  title: string
  group: string // sidebar section, e.g. "Radio lab"
  icon: LucideIcon
  requiredRole: "admin" | null
  component: ComponentType
}
