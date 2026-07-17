import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PersonalStats } from "../personal-stats"

describe("PersonalStats", () => {
  it("shows your clicks (incl. pending) and your impact", () => {
    render(<PersonalStats myTotal={3_910} pending={0} stalled={false} total={1_204_882} />)
    expect(screen.getByText("3,910")).toBeInTheDocument()
    expect(screen.getByText("0.32%")).toBeInTheDocument() // 3,910 / 1,204,882 ≈ 0.3245%
  })

  it("counts pending clicks without ever showing the pending count", () => {
    render(<PersonalStats myTotal={100} pending={5} stalled={false} total={1_000} />)
    expect(screen.getByText("105")).toBeInTheDocument()
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument()
  })

  it("shows a retrying hint only when the pipeline is stalled", () => {
    const { rerender } = render(
      <PersonalStats myTotal={100} pending={5} stalled={false} total={1_000} />
    )
    expect(screen.queryByText(/retrying/i)).not.toBeInTheDocument()
    rerender(<PersonalStats myTotal={100} pending={5} stalled total={1_000} />)
    expect(screen.getByText(/retrying/i)).toBeInTheDocument()
  })

  it("shows an em dash for impact when total is unknown", () => {
    render(<PersonalStats myTotal={null} pending={0} stalled={false} total={null} />)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })
})
