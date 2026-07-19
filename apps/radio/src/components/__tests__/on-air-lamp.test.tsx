import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OnAirLamp } from "../on-air-lamp"

describe("OnAirLamp", () => {
  it("shows the right label per status", () => {
    const { rerender } = render(<OnAirLamp status="on-air" />)
    expect(screen.getByText("ON AIR")).toBeInTheDocument()
    rerender(<OnAirLamp status="music-only" />)
    expect(screen.getByText("MUSIC ONLY")).toBeInTheDocument()
    rerender(<OnAirLamp status="off-air" />)
    expect(screen.getByText("OFF AIR")).toBeInTheDocument()
  })
})
