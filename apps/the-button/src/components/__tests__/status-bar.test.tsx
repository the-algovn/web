import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusBar } from "../status-bar"

describe("StatusBar", () => {
  it("shows the live mode and the eta text", () => {
    render(<StatusBar mode="live" eta={{ seconds: 100, text: "~2.4k years" }} />)
    expect(screen.getByText(/live/)).toBeInTheDocument()
    expect(screen.getByText(/ETA ~2\.4k years/)).toBeInTheDocument()
  })
  it("shows the connecting state", () => {
    render(<StatusBar mode="connecting" eta={{ seconds: null, text: "calculating…" }} />)
    expect(screen.getByText(/connecting/)).toBeInTheDocument()
  })
})
