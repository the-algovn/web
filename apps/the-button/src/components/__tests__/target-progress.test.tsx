import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProgressBar } from "../progress-bar"
import { TargetHeadline } from "../target-headline"

describe("TargetHeadline", () => {
  it("shows the quadrillion target", () => {
    render(<TargetHeadline />)
    expect(screen.getByText("1,000,000,000,000,000")).toBeInTheDocument()
    expect(screen.getByText("one quadrillion clicks")).toBeInTheDocument()
  })
})

describe("ProgressBar", () => {
  it("fills toward the next milestone", () => {
    render(<ProgressBar total={1_204_882} />)
    expect(screen.getByText(/10,000,000/)).toBeInTheDocument()
    expect(screen.getByText("12.0%")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "12")
  })
  it("renders an empty bar when the total is unknown", () => {
    render(<ProgressBar total={null} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })
})
