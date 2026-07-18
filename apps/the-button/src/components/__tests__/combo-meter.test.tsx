import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ComboMeter } from "../combo-meter"

describe("ComboMeter", () => {
  it("renders the multiplier and label", () => {
    render(<ComboMeter multiplier={3} heat={50} label="heating" />)
    expect(screen.getByText("×3.0")).toBeInTheDocument()
    expect(screen.getByText("heating")).toBeInTheDocument()
  })

  it("sizes the heat bar and exposes a heat band for styling", () => {
    render(<ComboMeter multiplier={5} heat={100} label="on fire" />)
    expect(screen.getByTestId("combo-heat")).toHaveStyle({ width: "100%" })
    expect(screen.getByTestId("combo-value")).toHaveAttribute("data-heat", "hot")
  })
})
