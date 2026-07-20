import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TabBar } from "../tab-bar"

describe("TabBar", () => {
  it("renders the four sections and marks the active one", () => {
    render(<TabBar active="play" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "PLAY" })).toHaveAttribute(
      "aria-current",
      "true",
    )
    expect(screen.getByRole("button", { name: "RANKS" })).toHaveAttribute(
      "aria-current",
      "false",
    )
  })

  it("calls onChange with the tab id", async () => {
    const onChange = vi.fn()
    render(<TabBar active="play" onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "GOALS" }))
    expect(onChange).toHaveBeenCalledWith("goals")
  })
})
