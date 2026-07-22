import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StationBar } from "../station-bar"

const stats = { listeners: 3, libraryCount: 12, spendTodayUsd: 0.25, budgetUsd: 1 }

describe("StationBar", () => {
  it("gates go-on-air ONLY on a non-empty library (wedge-bug regression)", () => {
    const go = vi.fn()
    render(
      <StationBar station={{}} stats={stats} busy={false} onGoOnAir={go} onGoOffAir={vi.fn()} onToggleAI={vi.fn()} />,
    )
    const btn = screen.getByRole("button", { name: "Go on air" })
    expect(btn).not.toBeDisabled() // libraryCount 12 — no playlist concept anywhere
    fireEvent.click(btn)
    expect(go).toHaveBeenCalled()
  })

  it("disables go-on-air with an empty library", () => {
    render(
      <StationBar station={{}} stats={{ ...stats, libraryCount: 0 }} busy={false} onGoOnAir={vi.fn()} onGoOffAir={vi.fn()} onToggleAI={vi.fn()} />,
    )
    expect(screen.getByRole("button", { name: "Go on air" })).toBeDisabled()
    expect(screen.getByText("Library is empty — ingest tracks first.")).toBeInTheDocument()
  })

  it("shows listeners and spend, and toggles the AI pause", () => {
    const toggle = vi.fn()
    render(
      <StationBar
        station={{ onAir: true, aiEnabled: true, onAirSince: "2026-07-22T09:00:00Z" }}
        stats={stats}
        busy={false}
        onGoOnAir={vi.fn()}
        onGoOffAir={vi.fn()}
        onToggleAI={toggle}
      />,
    )
    expect(screen.getByText("ON AIR")).toBeInTheDocument()
    expect(screen.getByText("3 listening")).toBeInTheDocument()
    expect(screen.getByText("$0.25 / $1.00")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Tiểu Dương Dương: on" }))
    expect(toggle).toHaveBeenCalledWith(false)
  })

  it("shows the paused label when AI is off", () => {
    const toggle = vi.fn()
    render(
      <StationBar station={{ aiEnabled: false }} stats={stats} busy={false} onGoOnAir={vi.fn()} onGoOffAir={vi.fn()} onToggleAI={toggle} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Tiểu Dương Dương: paused" }))
    expect(toggle).toHaveBeenCalledWith(true)
  })
})
