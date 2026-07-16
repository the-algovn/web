import { AudioLines, Brain, House } from "lucide-react"
import { BrainPlayground } from "./brain-playground"
import { Home } from "./home"
import { VoiceAudition } from "./voice-audition"
import type { ConsoleModule } from "./types"

export const registry: ConsoleModule[] = [
  { id: "home", title: "Home", group: "Console", icon: House, requiredRole: null, component: Home },
  { id: "voice-audition", title: "Voice audition", group: "Radio lab", icon: AudioLines, requiredRole: "admin", component: VoiceAudition },
  { id: "brain-playground", title: "Brain playground", group: "Radio lab", icon: Brain, requiredRole: "admin", component: BrainPlayground },
]
