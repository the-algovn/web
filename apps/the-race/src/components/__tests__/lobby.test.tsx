import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Lobby } from "../lobby"

const props = {
  signedIn: true,
  authConfigured: true,
  busy: false,
  error: "",
  onSignIn: () => {},
  onStart: () => {},
}

describe("Lobby", () => {
  it("will not start a race until two ducks are named", async () => {
    const onStart = vi.fn()
    render(<Lobby {...props} onStart={onStart} />)

    const start = screen.getByRole("button", { name: "Thả vịt!" })
    expect(start).toBeDisabled()

    await userEvent.type(screen.getByLabelText("Tên vịt 1"), "Đức")
    expect(start).toBeDisabled()

    await userEvent.type(screen.getByLabelText("Tên vịt 2"), "Lan")
    expect(start).toBeEnabled()

    await userEvent.click(start)
    expect(onStart).toHaveBeenCalledWith("Ai trả tiền cà phê?", ["Đức", "Lan"])
  })

  it("drops blank rows rather than racing an unnamed duck", async () => {
    const onStart = vi.fn()
    render(<Lobby {...props} onStart={onStart} />)

    await userEvent.type(screen.getByLabelText("Tên vịt 1"), "Đức")
    await userEvent.type(screen.getByLabelText("Tên vịt 2"), "Lan")
    await userEvent.click(screen.getByRole("button", { name: "Thêm vịt" }))
    // third row left empty on purpose
    await userEvent.click(screen.getByRole("button", { name: "Thả vịt!" }))

    expect(onStart).toHaveBeenCalledWith("Ai trả tiền cà phê?", ["Đức", "Lan"])
  })

  it("asks an anonymous visitor to sign in instead of racing", () => {
    render(<Lobby {...props} signedIn={false} />)

    expect(
      screen.getByRole("button", { name: "Đăng nhập để tạo phòng" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Thả vịt!" })).toBeNull()
  })

  // Until a Zitadel client exists there is nothing to sign in to; the screen has
  // to say so rather than offering a button that cannot work.
  it("explains itself when no auth client is registered", () => {
    render(<Lobby {...props} signedIn={false} authConfigured={false} />)

    expect(screen.getByText(/Chưa đăng ký ứng dụng đăng nhập/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Đăng nhập để tạo phòng" }),
    ).toBeNull()
  })

  it("shows a server error to the person who caused it", () => {
    render(<Lobby {...props} error="too many races — try again shortly" />)
    expect(screen.getByRole("alert")).toHaveTextContent(
      "too many races — try again shortly",
    )
  })

  it("caps the field at twelve ducks", async () => {
    render(<Lobby {...props} />)
    for (let i = 0; i < 10; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Thêm vịt" }))
    }
    expect(screen.getByLabelText("Tên vịt 12")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Thêm vịt" })).toBeNull()
  })
})
