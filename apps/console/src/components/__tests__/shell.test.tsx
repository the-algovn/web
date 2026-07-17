import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Shell } from "../shell"

describe("Shell module gating", () => {
  it("hides lab modules when enableLab is false, even for an admin", () => {
    render(<Shell roles={["admin"]} enableLab={false} />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.queryByText("Radio lab")).not.toBeInTheDocument()
    expect(screen.queryByText("Voice audition")).not.toBeInTheDocument()
  })

  it("shows lab modules when enableLab is true and the user is admin", () => {
    render(<Shell roles={["admin"]} enableLab={true} />)
    expect(screen.getByText("Radio lab")).toBeInTheDocument()
    expect(screen.getByText("Voice audition")).toBeInTheDocument()
    expect(screen.getByText("Mini-render")).toBeInTheDocument()
  })

  it("hides lab modules from a non-admin even when enableLab is true", () => {
    render(<Shell roles={[]} enableLab={true} />)
    expect(screen.queryByText("Voice audition")).not.toBeInTheDocument()
  })
})
