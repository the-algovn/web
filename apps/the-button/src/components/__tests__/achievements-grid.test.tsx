import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CatalogEntry } from "../../lib/catalog"
import { AchievementsGrid } from "../achievements-grid"

describe("AchievementsGrid", () => {
  it("counts against the entries it was given, not a hardcoded 12", () => {
    // A server-driven catalog can be any size (spec: ~20 ids). The badge
    // must reflect the actual entries passed in.
    const entries: CatalogEntry[] = Array.from({ length: 20 }, (_, i) => ({
      id: `id-${i}`,
      title: `Achievement ${i}`,
      description: "desc",
      unlockedAt: i < 3 ? "2026-07-14T00:00:00Z" : undefined,
    }))
    render(<AchievementsGrid entries={entries} />)
    expect(screen.getByText("3/20")).toBeInTheDocument()
  })

  it("renders a server-only achievement id that has no static-catalog counterpart", () => {
    const entries: CatalogEntry[] = [
      {
        id: "mvh",
        title: "Minimum Viable Human",
        description: "You clicked the button.",
      },
      {
        id: "over9000",
        title: "It's Over 9000!",
        description: "Your total crossed 9,000.",
        unlockedAt: "2026-07-15T00:00:00Z",
      },
    ]
    render(<AchievementsGrid entries={entries} />)
    expect(screen.getByText("1/2")).toBeInTheDocument()
    expect(screen.getByText("It's Over 9000!")).toBeInTheDocument()
  })

  it("falls back to a default emoji instead of rendering blank for an id with no meta entry", () => {
    const entries: CatalogEntry[] = [
      {
        id: "totally-unknown-server-id",
        title: "Mystery Achievement",
        description: "desc",
        unlockedAt: "2026-07-15T00:00:00Z",
      },
    ]
    render(<AchievementsGrid entries={entries} />)
    // Unlocked, so the card renders its title and the fallback trophy emoji
    // rather than a blank icon.
    expect(screen.getByText("Mystery Achievement")).toBeInTheDocument()
    expect(screen.getByText("🏆")).toBeInTheDocument()
  })
})
