import {
  AudioLines,
  Brain,
  Download,
  House,
  ListMusic,
  MessageSquareQuote,
  Mic,
  RadioTower,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react"
import { BrainPlayground } from "./brain-playground"
import { CallinParse } from "./callin-parse"
import { DJ } from "./dj"
import { Home } from "./home"
import { Ingest } from "./ingest"
import { Library } from "./library"
import { LLMAudit } from "./llm-audit"
import { MiniRender } from "./mini-render"
import { Radio } from "./radio"
import type { ConsoleModule } from "./types"
import { VoiceAudition } from "./voice-audition"

export const registry: ConsoleModule[] = [
  {
    id: "home",
    title: "Home",
    group: "Console",
    icon: House,
    requiredRole: null,
    component: Home,
  },
  {
    id: "radio",
    title: "Radio",
    group: "Radio",
    icon: RadioTower,
    requiredRole: "admin",
    component: Radio,
  },
  {
    id: "dj",
    title: "DJ",
    group: "Radio",
    icon: Mic,
    requiredRole: "admin",
    component: DJ,
  },
  {
    id: "voice-audition",
    title: "Voice audition",
    group: "Radio lab",
    icon: AudioLines,
    requiredRole: "admin",
    component: VoiceAudition,
  },
  {
    id: "brain-playground",
    title: "Brain playground",
    group: "Radio lab",
    icon: Brain,
    requiredRole: "admin",
    component: BrainPlayground,
  },
  {
    id: "callin-parse",
    title: "Call-in parse",
    group: "Radio lab",
    icon: MessageSquareQuote,
    requiredRole: "admin",
    component: CallinParse,
  },
  {
    id: "ingest",
    title: "Ingest",
    group: "Radio lab",
    icon: Download,
    requiredRole: "admin",
    component: Ingest,
  },
  {
    id: "mini-render",
    title: "Mini-render",
    group: "Radio lab",
    icon: SlidersHorizontal,
    requiredRole: "admin",
    component: MiniRender,
  },
  {
    id: "library",
    title: "Library",
    group: "Radio lab",
    icon: ListMusic,
    requiredRole: "admin",
    component: Library,
  },
  {
    id: "llm-audit",
    title: "LLM calls",
    group: "Radio lab",
    icon: ScrollText,
    requiredRole: "admin",
    component: LLMAudit,
  },
]
