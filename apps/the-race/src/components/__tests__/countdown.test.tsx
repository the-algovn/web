import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Countdown } from "../countdown"

const threes = () => screen.getAllByText("3")
/** The digit a viewer reads, and the ripple behind it. */
const digit = () => threes().find((el) => !el.closest("[aria-hidden]"))
const ghost = () => threes().find((el) => el.closest("[aria-hidden]"))

describe("Countdown", () => {
  it("counts the beat down over the lanes", () => {
    render(<Countdown localMs={0} />)
    expect(digit()).toBeInTheDocument()
  })

  it("never puts the ripple on the digit itself", () => {
    // Tailwind's ping ends at opacity 0, and one iteration with no fill mode
    // means the digit would ripple out to invisible over 400ms and then hard-pop
    // back to solid for the remaining 350ms of its slot. Adding `forwards` is
    // not the fix either — it would simply leave the digit gone.
    render(<Countdown localMs={0} />)

    expect(digit()?.className).not.toMatch(/animate-/)
    expect(ghost()?.className).toMatch(/animate-/)
  })

  it("hides the ripple from a screen reader, so the count is read once", () => {
    render(<Countdown localMs={0} />)
    expect(threes()).toHaveLength(2)
    expect(ghost()).toBeInTheDocument()
  })
})
