import { MousePointerClick, Music, type LucideIcon } from "lucide-react"

export type AppTile = {
  id: string
  name: string
  icon: LucideIcon
  /** Products live under paths on algovn.com, e.g. /the-button */
  href: string
  /** Tailwind gradient stops for the tile background */
  gradient: string
  status: "live" | "soon"
}

export const apps: AppTile[] = [
  {
    id: "the-button",
    name: "The Button",
    icon: MousePointerClick,
    href: "/the-button",
    gradient: "from-rose-500 to-orange-500",
    status: "soon",
  },
  {
    id: "the-song",
    name: "The Song",
    icon: Music,
    href: "/the-song",
    gradient: "from-sky-500 to-indigo-600",
    status: "soon",
  },
]
