import { AudioLines, House } from "lucide-react"
import { Home } from "./home"
import { VoiceAudition } from "./voice-audition"
import type { ConsoleModule } from "./types"

export const registry: ConsoleModule[] = [
  { id: "home", title: "Home", group: "Console", icon: House, requiredRole: null, component: Home },
  { id: "voice-audition", title: "Voice audition", group: "Radio lab", icon: AudioLines, requiredRole: "admin", component: VoiceAudition },
]
