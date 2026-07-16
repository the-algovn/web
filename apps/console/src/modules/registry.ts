import { AudioLines, Brain, Download, House, MessageSquareQuote } from "lucide-react"
import { BrainPlayground } from "./brain-playground"
import { CallinParse } from "./callin-parse"
import { Home } from "./home"
import { Ingest } from "./ingest"
import { VoiceAudition } from "./voice-audition"
import type { ConsoleModule } from "./types"

export const registry: ConsoleModule[] = [
  { id: "home", title: "Home", group: "Console", icon: House, requiredRole: null, component: Home },
  { id: "voice-audition", title: "Voice audition", group: "Radio lab", icon: AudioLines, requiredRole: "admin", component: VoiceAudition },
  { id: "brain-playground", title: "Brain playground", group: "Radio lab", icon: Brain, requiredRole: "admin", component: BrainPlayground },
  { id: "callin-parse", title: "Call-in parse", group: "Radio lab", icon: MessageSquareQuote, requiredRole: "admin", component: CallinParse },
  { id: "ingest", title: "Ingest", group: "Radio lab", icon: Download, requiredRole: "admin", component: Ingest },
]
