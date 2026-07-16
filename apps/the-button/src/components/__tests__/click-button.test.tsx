import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { ClickButton } from "../click-button"

test("calls onMash and onParticle when clicked", async () => {
  const onMash = vi.fn()
  const onParticle = vi.fn()
  render(<ClickButton onMash={onMash} onParticle={onParticle} />)
  await userEvent.click(screen.getByRole("button", { name: /contribute/i }))
  expect(onMash).toHaveBeenCalledTimes(1)
  expect(onParticle).toHaveBeenCalledTimes(1)
})
