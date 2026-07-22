import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { History } from "../history"

describe("History", () => {
  it("badges past plays by source and leaves shuffle plain", () => {
    render(
      <History
        items={[
          { title: "A", airedAt: "2026-07-22T04:00:00Z", source: "listener", requestedByName: "Ngọc" },
          { title: "B", airedAt: "2026-07-22T03:00:00Z", source: "ai" },
          { title: "C", airedAt: "2026-07-22T02:00:00Z" },
        ]}
      />,
    )
    expect(screen.getByText("Yêu cầu · Ngọc")).toBeInTheDocument()
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument()
    expect(screen.getAllByText(/Yêu cầu ·|Tiểu Dương Dương chọn/)).toHaveLength(2)
  })
})
