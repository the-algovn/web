import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Candidate } from "../../lib/request-client"
import { Compose, type ComposeState, MESSAGE_LIMIT, Sent } from "../compose"

const candidate: Candidate = {
  ytId: "y1",
  title: "Diễm Xưa",
  channel: "Khánh Ly",
  durationS: 271,
}

function setup(over: Partial<ComposeState> = {}, layout: "phone" | "dock" = "phone") {
  const handlers = {
    onMessage: vi.fn(),
    onToggleAir: vi.fn(),
    onCancel: vi.fn(),
    onSend: vi.fn(),
  }
  render(
    <Compose
      layout={layout}
      state={{ candidate, message: "", onAir: true, ...over }}
      signature="Ngọc"
      busy={false}
      error={null}
      {...handlers}
    />,
  )
  return handlers
}

describe("Compose", () => {
  it("counts down against the server's own 400-rune cap", () => {
    setup({ message: "xin chào" })
    expect(screen.getByText(`CÒN ${MESSAGE_LIMIT - 8}`)).toBeInTheDocument()
  })

  it("counts Vietnamese characters as one each, not as UTF-16 units", () => {
    setup({ message: "ượ" })
    expect(screen.getByText(`CÒN ${MESSAGE_LIMIT - 2}`)).toBeInTheDocument()
  })

  it("shows the signature the station derived, with no way to type another", () => {
    setup()
    expect(screen.getByText("Ngọc")).toBeInTheDocument()
    // One field only: the message. The signature is not an input.
    expect(screen.queryByRole("textbox", { name: /ký tên/i })).toBeNull()
  })

  it("disables the message when the listener turns off reading it on air", () => {
    setup({ onAir: false })
    expect(screen.getByLabelText("Lời nhắn")).toBeDisabled()
  })

  it("reports the on-air choice as a pressed state", () => {
    setup({ onAir: true })
    const toggle = screen.getByRole("button", { name: /đọc lời nhắn trên sóng/i })
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(toggle)
  })

  it("trims the message to the cap rather than accepting an over-long one", () => {
    const { onMessage } = setup()
    fireEvent.change(screen.getByLabelText("Lời nhắn"), {
      target: { value: "ữ".repeat(MESSAGE_LIMIT + 50) },
    })
    expect(onMessage).toHaveBeenCalledWith("ữ".repeat(MESSAGE_LIMIT))
  })

  it("sends and cancels through its callbacks", () => {
    const { onSend, onCancel } = setup()
    fireEvent.click(screen.getByRole("button", { name: "GỬI LÊN ĐÀI" }))
    expect(onSend).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "HUỶ" }))
    expect(onCancel).toHaveBeenCalled()
  })

  it("surfaces a send failure as an alert", () => {
    render(
      <Compose
        layout="phone"
        state={{ candidate, message: "", onAir: true }}
        signature="Ngọc"
        busy={false}
        error="đài đang bận, thử lại nhé"
        onMessage={vi.fn()}
        onToggleAir={vi.fn()}
        onCancel={vi.fn()}
        onSend={vi.fn()}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("đài đang bận")
  })

  it("docks into the request column on desktop, with the same fields", () => {
    setup({ message: "hi" }, "dock")
    expect(screen.getByLabelText("Lời nhắn")).toBeInTheDocument()
    expect(screen.getByText("Ngọc")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "GỬI" })).toBeInTheDocument()
  })
})

describe("Sent", () => {
  it("reports the queue position and echoes back what was sent", () => {
    render(
      <Sent
        layout="phone"
        state={{
          title: "Diễm Xưa",
          artist: "Khánh Ly",
          message: "Gửi mẹ",
          position: 3,
        }}
        onSeeQueue={vi.fn()}
        onDone={vi.fn()}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("ĐÃ GỬI LÊN ĐÀI")
    expect(
      screen.getByText("Bạn đang ở vị trí #3 trong hàng đợi."),
    ).toBeInTheDocument()
    expect(screen.getByText("Gửi mẹ")).toBeInTheDocument()
  })

  it("offers both onward routes", () => {
    const onSeeQueue = vi.fn()
    const onDone = vi.fn()
    render(
      <Sent
        layout="phone"
        state={{ title: "Diễm Xưa", position: 1 }}
        onSeeQueue={onSeeQueue}
        onDone={onDone}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "XEM HÀNG ĐỢI" }))
    expect(onSeeQueue).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "VỀ ĐÀI" }))
    expect(onDone).toHaveBeenCalled()
  })
})
