import { render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { mergeCatalog } from "../../lib/catalog"
import { AchievementsGrid } from "../achievements-grid"
import { MilestoneBanner } from "../milestone-banner"

it("renders the full catalog with locked entries greyed and mocked", () => {
  render(<AchievementsGrid entries={mergeCatalog([{ id: "mvh", unlockedAt: "2026-07-14T00:00:00Z" }])} />)
  const items = screen.getAllByRole("listitem")
  expect(items).toHaveLength(12)
  expect(screen.getByText("Minimum Viable Human").closest("[data-unlocked]")).toHaveAttribute(
    "data-unlocked",
    "true"
  )
  expect(screen.getByText("Carpal Diem").closest("[data-unlocked]")).toHaveAttribute(
    "data-unlocked",
    "false"
  )
  // locked entries keep their mocking copy visible
  expect(screen.getByText(/Seize the day\. Stretch the wrist\./)).toBeInTheDocument()
})

it("renders the milestone banner and hides it without a milestone", () => {
  const { rerender } = render(<MilestoneBanner milestone={null} />)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
  rerender(<MilestoneBanner milestone={{ threshold: 1000, title: "A Thousand Tiny Rebellions" }} />)
  expect(screen.getByRole("status")).toHaveTextContent("1,000 clicks — A Thousand Tiny Rebellions")
})
