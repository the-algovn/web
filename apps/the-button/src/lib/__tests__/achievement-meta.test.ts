import { expect, it } from "vitest"
import { achievementMeta } from "../achievement-meta"

it("known achievement returns emoji and requirement", () => {
  expect(achievementMeta("carpal")).toEqual({ emoji: "🖐️", requirement: "10,000 clicks" })
  expect(achievementMeta("night").requirement).toMatch(/03:00/)
})

it("unknown id falls back to trophy with no requirement", () => {
  expect(achievementMeta("nope")).toEqual({ emoji: "🏆", requirement: "" })
})

it("has real meta (not the fallback trophy) for all 8 new server achievement ids", () => {
  const newIds = ["deep_thought", "irrational", "cursed", "elite", "over9000", "chonk", "witching", "dawn"]
  for (const id of newIds) {
    const meta = achievementMeta(id)
    expect(meta.emoji).not.toBe("🏆")
    expect(meta.requirement).not.toBe("")
  }
})
