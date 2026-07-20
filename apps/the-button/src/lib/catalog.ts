// Client-side fallback copy for the spec §9 catalog. The server catalog wins
// when ListAchievements answers; this copy keeps the grid rendered (and the
// locked-entry mockery intact) when it can't (spec §13: Postgres down still
// serves the bare catalog).
import type { Achievement } from "./api"

export interface CatalogEntry {
  id: string
  title: string
  description: string
  unlockedAt?: string
}

export const ACHIEVEMENT_CATALOG: CatalogEntry[] = [
  {
    id: "mvh",
    title: "Minimum Viable Human",
    description: "You clicked the button. Once. Welcome to the revolution.",
  },
  {
    id: "ten",
    title: "Double Digits",
    description: "Ten clicks. The finger is warming up.",
  },
  {
    id: "century",
    title: "Century of Defiance",
    description: "100 clicks. Dedication, or boredom — we don't judge.",
  },
  {
    id: "comma",
    title: "The Comma Club",
    description: "1,000 clicks. You have earned punctuation.",
  },
  {
    id: "carpal",
    title: "Carpal Diem",
    description: "10,000 clicks. Seize the day. Stretch the wrist.",
  },
  {
    id: "stretch",
    title: "Please Stretch",
    description: "100,000 clicks. This is a health advisory.",
  },
  {
    id: "nice",
    title: "Nice.",
    description: "Your total crossed 69. Nice.",
  },
  {
    id: "blaze",
    title: "Botanical Enthusiast",
    description: "Your total crossed 420. Purely botanical interest, surely.",
  },
  {
    id: "bigbatch",
    title: "Mass Production",
    description: "500 clicks in a single batch. Industrial-grade mashing.",
  },
  {
    id: "maxbatch",
    title: "One Batch to Rule Them All",
    description: "A single 10,000-click batch. The server felt that.",
  },
  {
    id: "night",
    title: "3am Rebellion",
    description:
      "A batch between 03:00 and 03:59 in Ho Chi Minh City. Go to sleep. After one more.",
  },
  {
    id: "lunch",
    title: "Lunch Break Rebel",
    description:
      "A batch during the 12:00 lunch hour, Ho Chi Minh time. Productivity is a construct.",
  },
]

export const MILESTONE_CATALOG: { threshold: number; title: string }[] = [
  { threshold: 1_000, title: "A Thousand Tiny Rebellions" },
  { threshold: 100_000, title: "Six Figures of Defiance" },
  { threshold: 1_000_000, title: "One Million. Together We Did… This." },
  { threshold: 10_000_000, title: "Ten Million Clicks Nobody Asked For" },
  { threshold: 1_000_000_000, title: "The Billion" },
]

// `server` is GetPlayerState's ps.achievements: when present and non-empty
// it is the AUTHORITATIVE full catalog (~20 ids, some outside the static
// list below) and drives the grid entirely — every server id renders, using
// server title/description and falling back to the static copy only for ids
// the two lists happen to share. Absent or empty (signed out, or the fetch
// failed/hasn't landed) falls back to the static 12-entry offline catalog.
export function mergeCatalog(
  server: Achievement[] | undefined,
): CatalogEntry[] {
  if (!server || server.length === 0) {
    return ACHIEVEMENT_CATALOG.map((entry) => ({ ...entry }))
  }
  const staticById = new Map(
    ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry]),
  )
  return server.map((s) => {
    const id = s.id ?? ""
    const fallback = staticById.get(id)
    return {
      id,
      title: s.title ?? fallback?.title ?? id,
      description: s.description ?? fallback?.description ?? "",
      unlockedAt: s.unlockedAt,
    }
  })
}
