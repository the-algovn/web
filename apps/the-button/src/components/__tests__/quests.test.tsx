import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Quests } from "../quests"

describe("Quests", () => {
  it("shows a syncing placeholder until the backend lands", () => {
    render(<Quests />)
    expect(screen.getByText(/syncing your streak/i)).toBeInTheDocument()
  })

  it("does not use role=status (reserved for the milestone banner)", () => {
    render(<Quests />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
