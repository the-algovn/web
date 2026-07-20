import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { IntroSlides } from "../intro-slides"

function renderIntro(onDone = vi.fn()) {
  render(
    <IntroSlides
      total={1_204_882}
      etaText="~3 years"
      topNames={["ada", "grace", "linus"]}
      questCount={4}
      achievementCount={20}
      onDone={onDone}
    />,
  )
  return onDone
}

describe("IntroSlides", () => {
  it("opens as a modal dialog on the why slide", () => {
    renderIntro()
    expect(screen.getByRole("dialog", { name: "intro" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "// why?" })).toBeInTheDocument()
    expect(
      screen.getByText("every click is a tiny rebellion"),
    ).toBeInTheDocument()
  })

  it("walks forward to the count-vs-target slide", async () => {
    renderIntro()
    await userEvent.click(screen.getByRole("button", { name: "NEXT ›" }))
    expect(screen.getByText("1,204,882")).toBeInTheDocument()
    expect(screen.getByText(/1,000,000,000,000,000/)).toBeInTheDocument()
    expect(screen.getByText("~3 years")).toBeInTheDocument()
  })

  it("jumps via the dots and shows the CTA on the last slide", async () => {
    renderIntro()
    await userEvent.click(screen.getByRole("button", { name: "slide 5" }))
    expect(screen.getByText(/ada, grace, linus/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "[ START CLICKING ]" }),
    ).toBeInTheDocument()
  })

  it("finishes via the CTA", async () => {
    const onDone = renderIntro()
    await userEvent.click(screen.getByRole("button", { name: "slide 5" }))
    await userEvent.click(
      screen.getByRole("button", { name: "[ START CLICKING ]" }),
    )
    expect(onDone).toHaveBeenCalledWith("finished")
  })

  it("skips via the skip link and via Escape", async () => {
    const onDone = renderIntro()
    await userEvent.click(screen.getByRole("button", { name: "skip ›" }))
    expect(onDone).toHaveBeenCalledWith("skipped")
    await userEvent.keyboard("{Escape}")
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it("keeps Tab focus inside the dialog", async () => {
    renderIntro()
    const dialog = screen.getByRole("dialog", { name: "intro" })
    const buttons = Array.from(dialog.querySelectorAll("button"))
    const lastButton = buttons.at(-1)
    if (!lastButton) throw new Error("no buttons in dialog")
    lastButton.focus()
    await userEvent.keyboard("{Tab}")
    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})
