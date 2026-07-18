import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CpsMeter } from "../cps-meter"

describe("CpsMeter", () => {
  it("renders the current cps value with a per-second unit", () => {
    render(<CpsMeter cps={7} history={[1, 3, 7]} />)
    expect(screen.getByTestId("cps-value")).toHaveTextContent("7/s")
  })

  it("renders one spark bar per history sample", () => {
    render(<CpsMeter cps={0} history={[0, 2, 4, 1]} />)
    expect(screen.getAllByTestId("cps-bar")).toHaveLength(4)
  })
})
