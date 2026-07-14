export type AppTile = {
  id: string
  name: string
  description: string
  /** Products live under paths on algovn.com, e.g. /the-button */
  href: string
  status: "live" | "soon"
}

export const apps: AppTile[] = [
  {
    id: "the-button",
    name: "The Button",
    description: "One button. One global counter. Press it.",
    href: "/the-button",
    status: "soon",
  },
  {
    id: "the-song",
    name: "The Song",
    description: "A song a day, picked by an algorithm with taste.",
    href: "/the-song",
    status: "soon",
  },
]
