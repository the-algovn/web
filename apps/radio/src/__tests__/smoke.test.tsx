import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import App from "../App"

test("renders the station identity", () => {
  render(<App />)
  expect(screen.getByRole("heading", { name: /Tần Số 42/ })).toBeInTheDocument()
})
