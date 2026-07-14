import { expect, it } from "vitest"
import { ACHIEVEMENT_CATALOG, MILESTONE_CATALOG, mergeCatalog } from "../catalog"

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

it("merges server unlocks onto the fallback copy", () => {
  const merged = mergeCatalog([
    { id: "mvh", title: "Minimum Viable Human", unlockedAt: "2026-07-14T00:00:00Z" },
  ])
  expect(merged).toHaveLength(ACHIEVEMENT_CATALOG.length)
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
