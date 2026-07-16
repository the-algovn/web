import { House } from "lucide-react"
import { Home } from "./home"
import type { ConsoleModule } from "./types"

export const registry: ConsoleModule[] = [
  { id: "home", title: "Home", group: "Console", icon: House, requiredRole: null, component: Home },
]
