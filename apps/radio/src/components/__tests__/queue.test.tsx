import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Queue } from "../queue"

describe("Queue", () => {
  it("labels a dedicated item with a gift marker and never a name", () => {
    render(<Queue items={[{ title: "Nơi Này Có Anh", artist: "Sơn Tùng M-TP", hasDedication: true }]} />)
    expect(screen.getByText("Nơi Này Có Anh")).toBeInTheDocument()
    expect(screen.getByLabelText(/dedication/i)).toHaveTextContent("🎁")
  })
  it("renders nothing extra for a plain item", () => {
    render(<Queue items={[{ title: "Chạy Ngay Đi", hasDedication: false }]} />)
    expect(screen.queryByLabelText(/dedication/i)).not.toBeInTheDocument()
  })
})
