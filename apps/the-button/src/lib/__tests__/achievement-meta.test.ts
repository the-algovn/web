import { expect, it } from "vitest"
import { achievementMeta } from "../achievement-meta"

it("known achievement returns emoji and requirement", () => {
  expect(achievementMeta("carpal")).toEqual({ emoji: "🖐️", requirement: "10,000 clicks" })
  expect(achievementMeta("night").requirement).toMatch(/03:00/)
})

it("unknown id falls back to trophy with no requirement", () => {
  expect(achievementMeta("nope")).toEqual({ emoji: "🏆", requirement: "" })
})
