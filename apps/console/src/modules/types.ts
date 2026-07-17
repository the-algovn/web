import type { LucideIcon } from "lucide-react"
import type { ComponentType } from "react"

export interface ConsoleModule {
  id: string // kebab-case, used in location.hash
  title: string
  group: string // sidebar section, e.g. "Radio lab"
  icon: LucideIcon
  requiredRole: "admin" | null
  // Needs the radio-lab backend, which is local-only until it deploys. Says WHY
  // a module hides, not what group it's in — those coincide today and would drift.
  requiresLab: boolean
  component: ComponentType
}
