import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PersonalStats } from "../personal-stats"

describe("PersonalStats", () => {
  it("shows your clicks (incl. pending) and your impact", () => {
    render(<PersonalStats myTotal={3_910} pending={0} total={1_204_882} />)
    expect(screen.getByText("3,910")).toBeInTheDocument()
    expect(screen.getByText("0.32%")).toBeInTheDocument() // 3,910 / 1,204,882 ≈ 0.3245%
  })
  it("adds pending to your clicks and shows a pending badge", () => {
    render(<PersonalStats myTotal={100} pending={5} total={1_000} />)
    expect(screen.getByText("105")).toBeInTheDocument()
    expect(screen.getByText("5 pending")).toBeInTheDocument()
  })
  it("shows an em dash for impact when total is unknown", () => {
    render(<PersonalStats myTotal={null} pending={0} total={null} />)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })
})
