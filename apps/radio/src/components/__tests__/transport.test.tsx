import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Transport } from "../transport"

describe("Transport", () => {
  it("calls onPlay when idle and onPause when playing", async () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { rerender } = render(
      <Transport
        playerState="idle"
        onPlay={onPlay}
        onPause={onPause}
        onVolume={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /play/i }))
    expect(onPlay).toHaveBeenCalled()
    rerender(
      <Transport
        playerState="playing"
        onPlay={onPlay}
        onPause={onPause}
        onVolume={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /pause/i }))
    expect(onPause).toHaveBeenCalled()
  })

  it("shows a spinner glyph while connecting or stalled", () => {
    const noop = () => {}
    const { rerender } = render(
      <Transport
        playerState="connecting"
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
      />,
    )
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
    rerender(
      <Transport
        playerState="stalled"
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
      />,
    )
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
    rerender(
      <Transport
        playerState="playing"
        onPlay={noop}
        onPause={noop}
        onVolume={noop}
      />,
    )
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument()
  })

  it("reports volume changes", () => {
    const onVolume = vi.fn()
    render(
      <Transport
        playerState="playing"
        onPlay={() => {}}
        onPause={() => {}}
        onVolume={onVolume}
      />,
    )
    const slider = screen.getByRole("slider", { name: /volume/i })
    fireEvent.change(slider, { target: { value: "0.3" } })
    expect(onVolume).toHaveBeenCalledWith(0.3)
  })
})
