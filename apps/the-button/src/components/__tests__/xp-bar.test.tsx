import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { XpBar } from "../xp-bar"

describe("XpBar", () => {
  it("shows the current and next level and the xp fraction", () => {
    render(<XpBar level={7} pct={70} xpIntoLevel={4200} xpForNext={6000} />)
    expect(screen.getByText("LVL 7 → 8")).toBeInTheDocument()
    expect(screen.getByText("4,200 / 6,000 XP")).toBeInTheDocument()
  })

  it("sets the fill width from pct", () => {
    render(<XpBar level={1} pct={40} xpIntoLevel={20} xpForNext={50} />)
    expect(screen.getByTestId("xp-fill")).toHaveStyle({ width: "40%" })
  })
})
