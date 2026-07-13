import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it } from "vitest"
import { ThemeProvider } from "@algovn/ui/theme-provider"
import { ThemeToggle } from "@algovn/ui/theme-toggle"

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove("light", "dark")
})

it("defaults to dark and toggles to light and back", async () => {
  const user = userEvent.setup()
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"))

  await user.click(screen.getByRole("button", { name: /toggle theme/i }))
  await waitFor(() => expect(document.documentElement).toHaveClass("light"))

  await user.click(screen.getByRole("button", { name: /toggle theme/i }))
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
})
