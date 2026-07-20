import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ActivityFeed } from "../activity-feed"

describe("ActivityFeed", () => {
  it("shows a watching state when empty", () => {
    render(<ActivityFeed items={[]} />)
    expect(screen.getByText(/watching the counter/i)).toBeInTheDocument()
  })

  it("renders each aggregate delta and never a username", () => {
    render(
      <ActivityFeed
        items={[
          { id: 2, amount: 147 },
          { id: 1, amount: 3 },
        ]}
      />,
    )
    expect(screen.getByText("+147")).toBeInTheDocument()
    expect(screen.getByText("+3")).toBeInTheDocument()
  })
})
