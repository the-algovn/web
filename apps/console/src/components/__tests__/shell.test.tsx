import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Shell } from "../shell"

describe("Shell module gating", () => {
  it("shows lab modules to an admin", () => {
    render(<Shell roles={["admin"]} />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Library")).toBeInTheDocument()
  })

  it("hides lab modules from a non-admin", () => {
    render(<Shell roles={[]} />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.queryByText("Library")).not.toBeInTheDocument()
  })
})
