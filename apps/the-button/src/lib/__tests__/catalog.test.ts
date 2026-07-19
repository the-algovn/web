import { expect, it } from "vitest"
import { ACHIEVEMENT_CATALOG, MILESTONE_CATALOG, mergeCatalog } from "../catalog"
import type { Achievement } from "../api"

it("ships the full spec §9 catalog as client-side fallback", () => {
  expect(ACHIEVEMENT_CATALOG.map(entry => entry.id)).toEqual([
    "mvh",
    "ten",
    "century",
    "comma",
    "carpal",
    "stretch",
    "nice",
    "blaze",
    "bigbatch",
    "maxbatch",
    "night",
    "lunch",
  ])
  expect(MILESTONE_CATALOG.map(m => m.threshold)).toEqual([
    1_000, 100_000, 1_000_000, 10_000_000, 1_000_000_000,
  ])
})

it("merges server unlocks onto the fallback copy for ids the two lists share", () => {
  // A single-entry server list still stands in for "the authoritative
  // catalog" here — the id it does carry (mvh) is shared with the static
  // list, so its unlock + fallback description merge onto that entry.
  const merged = mergeCatalog([
    { id: "mvh", title: "Minimum Viable Human", unlockedAt: "2026-07-14T00:00:00Z" },
  ])
  const mvh = merged.find(entry => entry.id === "mvh")!
  expect(mvh.unlockedAt).toBe("2026-07-14T00:00:00Z")
  expect(mvh.description).not.toBe("") // fallback copy retained
  expect(merged.filter(entry => entry.unlockedAt)).toHaveLength(1)
})

it("returns the fully locked fallback catalog without server data", () => {
  const merged = mergeCatalog(undefined)
  expect(merged).toHaveLength(12)
  expect(merged.every(entry => !entry.unlockedAt)).toBe(true)
})

it("falls back to the static catalog when the server list is present but empty", () => {
  // GetPlayerState's achievements is never genuinely empty for a real
  // signed-in snapshot (spec: always the ~20-entry authoritative catalog) —
  // an empty array here means "no usable data", same as absent.
  const merged = mergeCatalog([])
  expect(merged).toHaveLength(12)
})

it("uses the server's full authoritative catalog, including ids outside the static list, when present", () => {
  const serverCatalog: Achievement[] = ACHIEVEMENT_CATALOG.map(entry => ({ id: entry.id, title: entry.title, description: entry.description }))
  serverCatalog.push({
    id: "over9000",
    title: "It's Over 9000!",
    description: "Your total crossed 9,000.",
    unlockedAt: "2026-07-15T00:00:00Z",
  })
  const merged = mergeCatalog(serverCatalog)
  // The count reflects the server's actual total, not a hardcoded 12.
  expect(merged).toHaveLength(ACHIEVEMENT_CATALOG.length + 1)
  const over9000 = merged.find(entry => entry.id === "over9000")!
  expect(over9000.title).toBe("It's Over 9000!")
  expect(over9000.unlockedAt).toBe("2026-07-15T00:00:00Z")
  expect(merged.filter(entry => entry.unlockedAt)).toHaveLength(1)
})
