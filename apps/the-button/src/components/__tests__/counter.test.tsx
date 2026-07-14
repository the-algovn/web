import { render, screen, waitFor } from "@testing-library/react"
import { expect, it } from "vitest"
import { Counter } from "../counter"

it("shows a placeholder before the first total arrives", () => {
  render(<Counter total={null} />)
  expect(screen.getByTestId("counter")).toHaveTextContent("—")
})

it("tweens to the new total", async () => {
  const { rerender } = render(<Counter total={null} />)
  rerender(<Counter total={1234} />)
  // The 600ms rAF tween plus jsdom/React commit overhead runs close to
  // waitFor's default 1000ms budget under load (e.g. lint/typecheck/build
  // running concurrently via turbo) — give it real headroom rather than
  // flake.
  await waitFor(() => expect(screen.getByTestId("counter")).toHaveTextContent("1,234"), {
    timeout: 5_000,
  })
})
