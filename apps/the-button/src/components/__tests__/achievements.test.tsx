import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"
import { AchievementsGrid } from "../achievements-grid"
import { MilestoneBanner } from "../milestone-banner"

const entries = [
  { id: "mvh", title: "Minimum Viable Human", description: "clicked once", unlockedAt: "2026-01-01" },
  { id: "carpal", title: "Carpal Diem", description: "10k clicks" },
  // a locked entry that is NOT the next target — hidden until expanded
  { id: "stretch", title: "Please Stretch", description: "100k clicks" },
]

it("shows count and highest-rank + next cards collapsed, expands on VIEW ALL", async () => {
  render(<AchievementsGrid entries={entries} />)
  expect(screen.getByText("1/3")).toBeInTheDocument()
  expect(screen.getByText("YOUR HIGHEST RANK")).toBeInTheDocument()
  expect(screen.getByText("NEXT TARGET")).toBeInTheDocument()
  // requirement string from achievement-meta (carpal = next target, shown collapsed)
  expect(screen.getByText("10,000 clicks")).toBeInTheDocument()
  // collapsed shows only featured + next; the third (stretch) card is hidden
  expect(screen.getAllByRole("listitem")).toHaveLength(2)
  expect(screen.queryByText("100,000 clicks")).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: /view all/i }))
  expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument()
  // expanded reveals every card, including the previously-hidden one
  expect(screen.getAllByRole("listitem")).toHaveLength(3)
  expect(screen.getByText("100,000 clicks")).toBeInTheDocument()
})

it("renders the milestone banner and hides it without a milestone", () => {
  const { rerender } = render(<MilestoneBanner milestone={null} />)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
  rerender(<MilestoneBanner milestone={{ threshold: 1000, title: "A Thousand Tiny Rebellions" }} />)
  expect(screen.getByRole("status")).toHaveTextContent("1,000 clicks — A Thousand Tiny Rebellions")
})
