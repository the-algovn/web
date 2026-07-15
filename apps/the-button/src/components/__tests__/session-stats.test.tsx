import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SessionStats } from "../session-stats"

describe("SessionStats", () => {
  it("shows the contributor count and the average", () => {
    render(<SessionStats total={1_204_882} users={84_201} />)
    expect(screen.getByText("84,201")).toBeInTheDocument()
    expect(screen.getByText("14.3")).toBeInTheDocument() // 1,204,882 / 84,201 ≈ 14.31
  })
  it("shows em dashes when data is missing", () => {
    render(<SessionStats total={null} users={null} />)
    expect(screen.getAllByText("—")).toHaveLength(2)
  })
})
