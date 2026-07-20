import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StationBar } from "../station-bar"

describe("StationBar", () => {
  it("shows OFF AIR and disables go-on-air without an active playlist", () => {
    render(
      <StationBar station={{}} busy={false} onGoOnAir={vi.fn()} onGoOffAir={vi.fn()} />,
    )
    expect(screen.getByText("OFF AIR")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go on air" })).toBeDisabled()
    expect(screen.getByText("Set a non-empty active playlist first.")).toBeInTheDocument()
  })

  it("enables go-on-air with an active non-empty playlist", () => {
    const go = vi.fn()
    render(
      <StationBar
        station={{ activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 3 }}
        busy={false}
        onGoOnAir={go}
        onGoOffAir={vi.fn()}
      />,
    )
    expect(screen.getByText("mix")).toBeInTheDocument()
    const btn = screen.getByRole("button", { name: "Go on air" })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(go).toHaveBeenCalled()
  })

  it("shows ON AIR and the off-air button while broadcasting", () => {
    const off = vi.fn()
    render(
      <StationBar
        station={{ onAir: true, activePlaylistId: "p1", activePlaylistName: "mix", activeTrackCount: 3, onAirSince: "2026-07-20T12:00:00Z" }}
        busy={false}
        onGoOnAir={vi.fn()}
        onGoOffAir={off}
      />,
    )
    expect(screen.getByText("ON AIR")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Go off air" }))
    expect(off).toHaveBeenCalled()
  })
})
