import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { QueuePane } from "../queue-pane"

const pending = [
  { id: "r1", source: "listener", requestedByName: "Ngọc", title: "L1", channel: "c", status: "ready" },
  { id: "r2", source: "ai", title: "A1", channel: "c", status: "approved", reason: "đổi gió" },
]

describe("QueuePane", () => {
  it("renders status chips, badges and the AI reason", () => {
    render(<QueuePane pending={pending} busy={false} onReorder={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText("sẵn sàng")).toBeInTheDocument()
    expect(screen.getByText("đang tải")).toBeInTheDocument()
    expect(screen.getByText("Yêu cầu · Ngọc")).toBeInTheDocument()
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument()
    expect(screen.getByText(/đổi gió/)).toBeInTheDocument() // regex: the reason span carries a leading " — "
  })

  it("move-down submits the whole reordered id list", () => {
    const onReorder = vi.fn()
    render(<QueuePane pending={pending} busy={false} onReorder={onReorder} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByLabelText("Move down L1"))
    expect(onReorder).toHaveBeenCalledWith(["r2", "r1"])
  })

  it("remove asks for confirmation then fires", () => {
    const onRemove = vi.fn()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<QueuePane pending={pending} busy={false} onReorder={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText("Remove L1"))
    expect(onRemove).toHaveBeenCalledWith("r1")
    confirmSpy.mockReturnValue(false)
    fireEvent.click(screen.getByLabelText("Remove A1"))
    expect(onRemove).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it("renders the shuffle empty state", () => {
    render(<QueuePane pending={[]} busy={false} onReorder={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText("Queue is empty — the shuffle bed is playing.")).toBeInTheDocument()
  })
})
