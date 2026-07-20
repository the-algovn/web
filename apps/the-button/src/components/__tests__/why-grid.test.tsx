import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WhyGrid } from "../why-grid"

describe("WhyGrid", () => {
  it("renders all four reasons with numbered markers", () => {
    render(<WhyGrid />)
    expect(screen.getByText("stress-testing a home server")).toBeInTheDocument()
    expect(
      screen.getByText("every click is a tiny rebellion"),
    ).toBeInTheDocument()
    expect(screen.getByText("[01]")).toBeInTheDocument()
    expect(screen.getByText("[04]")).toBeInTheDocument()
  })
})
