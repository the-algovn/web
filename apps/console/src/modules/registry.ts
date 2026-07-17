import { AudioLines, Brain, Download, House, MessageSquareQuote, SlidersHorizontal } from "lucide-react"
import { BrainPlayground } from "./brain-playground"
import { CallinParse } from "./callin-parse"
import { Home } from "./home"
import { Ingest } from "./ingest"
import { MiniRender } from "./mini-render"
import { VoiceAudition } from "./voice-audition"
import type { ConsoleModule } from "./types"

export const registry: ConsoleModule[] = [
  { id: "home", title: "Home", group: "Console", icon: House, requiredRole: null, requiresLab: false, component: Home },
  { id: "voice-audition", title: "Voice audition", group: "Radio lab", icon: AudioLines, requiredRole: "admin", requiresLab: true, component: VoiceAudition },
  { id: "brain-playground", title: "Brain playground", group: "Radio lab", icon: Brain, requiredRole: "admin", requiresLab: true, component: BrainPlayground },
  { id: "callin-parse", title: "Call-in parse", group: "Radio lab", icon: MessageSquareQuote, requiredRole: "admin", requiresLab: true, component: CallinParse },
  { id: "ingest", title: "Ingest", group: "Radio lab", icon: Download, requiredRole: "admin", requiresLab: true, component: Ingest },
  { id: "mini-render", title: "Mini-render", group: "Radio lab", icon: SlidersHorizontal, requiredRole: "admin", requiresLab: true, component: MiniRender },
]
