import { render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import App from "../App"

it("renders the page heading and the sign-in call to action", async () => {
  render(<App />)
  expect(screen.getByRole("heading", { name: "the button" })).toBeInTheDocument()
  expect(
    await screen.findByRole("button", { name: /sign in to contribute/i })
  ).toBeInTheDocument()
})
