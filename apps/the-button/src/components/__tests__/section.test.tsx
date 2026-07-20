import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Section } from "../section"

describe("Section", () => {
  it("renders the aria-label, the // header and the children", () => {
    render(
      <Section label="quests" title="// quests">
        <p>body</p>
      </Section>,
    )
    const section = screen.getByRole("region", { name: "quests" })
    expect(section).toHaveClass("tb-box")
    expect(
      screen.getByRole("heading", { name: "// quests" }),
    ).toBeInTheDocument()
    expect(screen.getByText("body")).toBeInTheDocument()
  })

  it("renders headerRight next to the heading", () => {
    render(
      <Section label="l" title="// t" headerRight={<span>42/100</span>}>
        <p>body</p>
      </Section>,
    )
    expect(screen.getByText("42/100")).toBeInTheDocument()
  })

  it("omits the box treatment for the plain variant", () => {
    render(
      <Section label="why" title="// why?" variant="plain">
        <p>body</p>
      </Section>,
    )
    expect(screen.getByRole("region", { name: "why" })).not.toHaveClass(
      "tb-box",
    )
  })
})
