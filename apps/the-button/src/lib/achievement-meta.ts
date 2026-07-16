// Visual-only metadata for the achievement catalog (spec §9 ids in lib/catalog.ts).
// The server ListAchievements owns title/description/unlock; this only adds an
// emoji and a short human requirement string for the prototype's card styling.
interface Meta {
  emoji: string
  requirement: string
}

const META: Record<string, Meta> = {
  mvh: { emoji: "🌱", requirement: "1 click" },
  ten: { emoji: "🔟", requirement: "10 clicks" },
  century: { emoji: "💯", requirement: "100 clicks" },
  comma: { emoji: "🔢", requirement: "1,000 clicks" },
  carpal: { emoji: "🖐️", requirement: "10,000 clicks" },
  stretch: { emoji: "🧘", requirement: "100,000 clicks" },
  nice: { emoji: "😎", requirement: "cross 69" },
  blaze: { emoji: "🌿", requirement: "cross 420" },
  bigbatch: { emoji: "🏭", requirement: "500 in one batch" },
  maxbatch: { emoji: "💥", requirement: "10,000 in one batch" },
  night: { emoji: "🌙", requirement: "03:00–03:59 ICT" },
  lunch: { emoji: "🥪", requirement: "12:00 lunch hour ICT" },
}

const FALLBACK: Meta = { emoji: "🏆", requirement: "" }

export function achievementMeta(id: string): Meta {
  return META[id] ?? FALLBACK
}
