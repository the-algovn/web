import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Hud } from "../hud"

describe("Hud", () => {
  it("renders the brand as the page heading and the level", () => {
    render(<Hud mode="live" level={7} streakDays={null} rank={null} />)
    expect(screen.getByRole("heading", { name: "THE BUTTON." })).toBeInTheDocument()
    expect(screen.getByText("LVL")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
  })

  it("shows the connection state", () => {
    render(<Hud mode="connecting" level={1} streakDays={null} rank={null} />)
    expect(screen.getByText("CONNECTING")).toBeInTheDocument()
  })

  it("hides the streak chip when there is no streak data", () => {
    render(<Hud mode="live" level={1} streakDays={null} rank={null} />)
    expect(screen.queryByText(/d$/)).not.toBeInTheDocument()
  })

  it("shows streak and rank when provided", () => {
    render(<Hud mode="live" level={2} streakDays={4} rank={1204} />)
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("#1,204")).toBeInTheDocument()
  })

  it("does not use role=status (reserved for the milestone banner)", () => {
    render(<Hud mode="live" level={1} streakDays={null} rank={null} />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
