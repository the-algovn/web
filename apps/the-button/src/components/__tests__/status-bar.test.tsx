import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusBar } from "../status-bar"

describe("StatusBar", () => {
  it("shows path, live status chip and ETA", () => {
    render(<StatusBar mode="live" eta={{ seconds: 1, text: "in 2 days" }} />)
    expect(screen.getByText("~/the-button")).toBeInTheDocument()
    expect(screen.getByText("LIVE")).toBeInTheDocument()
    expect(screen.getByText(/ETA:/)).toBeInTheDocument()
    expect(screen.getByText("in 2 days")).toBeInTheDocument()
  })

  it("shows disconnected styling when connecting", () => {
    render(<StatusBar mode="connecting" eta={{ seconds: null, text: "calculating…" }} />)
    expect(screen.getByText("CONNECTING")).toBeInTheDocument()
  })
})
