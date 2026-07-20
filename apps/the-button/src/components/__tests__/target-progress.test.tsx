import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProgressBar } from "../progress-bar"
import { TargetHeadline } from "../target-headline"

describe("TargetHeadline", () => {
  it("shows the quadrillion target", () => {
    render(<TargetHeadline total={null} users={null} />)
    expect(screen.getByText("1,000,000,000,000,000")).toBeInTheDocument()
    expect(screen.getByText("one quadrillion clicks")).toBeInTheDocument()
  })

  it("shows the ETA when provided", () => {
    render(<TargetHeadline total={null} users={null} eta="~3 years" />)
    expect(screen.getByText("~3 years")).toBeInTheDocument()
  })

  it("folds the session stats row into the panel", () => {
    render(<TargetHeadline total={1_000} users={4} />)
    expect(screen.getByText("TOTAL_SESSIONS")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("AVG_CLICKS/SESSION")).toBeInTheDocument()
    expect(screen.getByText("250.0")).toBeInTheDocument()
  })

  it("renders em dashes while stats are unknown", () => {
    render(<TargetHeadline total={null} users={null} />)
    expect(screen.getAllByText("—")).toHaveLength(2)
  })
})

describe("ProgressBar", () => {
  it("fills toward the next milestone", () => {
    render(<ProgressBar total={1_204_882} />)
    expect(screen.getByText("PROGRESS")).toBeInTheDocument()
    expect(screen.getByText("12.0%")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "12",
    )
  })
  it("renders an empty bar when the total is unknown", () => {
    render(<ProgressBar total={null} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    )
  })
})
