import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { clock } from "../../lib/format"
import { History } from "../history"
import { Queue } from "../queue"

describe("Queue", () => {
  it("labels a dedicated item with a gift marker and never a name", () => {
    render(
      <Queue
        items={[
          {
            title: "Nơi Này Có Anh",
            artist: "Sơn Tùng M-TP",
            hasDedication: true,
          },
        ]}
      />,
    )
    expect(screen.getByText("Nơi Này Có Anh")).toBeInTheDocument()
    expect(screen.getByLabelText(/dedication/i)).toHaveTextContent("🎁")
  })
  it("renders nothing extra for a plain item", () => {
    render(<Queue items={[{ title: "Chạy Ngay Đi", hasDedication: false }]} />)
    expect(screen.getByText("Chạy Ngay Đi")).toBeInTheDocument()
    expect(screen.queryByLabelText(/dedication/i)).not.toBeInTheDocument()
  })
})

describe("History", () => {
  it("shows the title and the air time via clock(airedAt)", () => {
    render(
      <History
        items={[
          {
            title: "Lạc Trôi",
            artist: "Sơn Tùng M-TP",
            airedAt: "2026-07-20T16:41:00Z",
          },
        ]}
      />,
    )
    expect(screen.getByText("Lạc Trôi")).toBeInTheDocument()
    expect(screen.getByText(clock("2026-07-20T16:41:00Z"))).toBeInTheDocument()
  })
})
