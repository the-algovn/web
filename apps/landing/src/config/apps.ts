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
    description: "One button. One goal. Millions of humans.",
    href: "/the-button",
    status: "live",
  },
  {
    id: "radio",
    name: "Tần Số 42",
    description: "A late-night radio station that programs itself.",
    href: "/radio",
    status: "live",
  },
  {
    id: "the-race",
    name: "Đua Vịt",
    description: "Let the ducks decide.",
    href: "/the-race",
    status: "live",
  },
]
