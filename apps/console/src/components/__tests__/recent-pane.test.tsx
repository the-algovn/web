import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RecentPane } from "../recent-pane"

describe("RecentPane", () => {
  it("renders terminal requests with status + fail reason, and history badges", () => {
    render(
      <RecentPane
        recent={[
          { id: "r1", title: "OK", status: "aired", source: "listener", requestedByName: "Ngọc" },
          { id: "r2", title: "Bad", status: "failed", failReason: "đài đã gỡ yêu cầu này", source: "ai" },
        ]}
        history={[
          { title: "H1", artist: "A", airedAt: "2026-07-22T08:00:00Z", source: "ai" },
          { title: "H2", airedAt: "2026-07-22T07:00:00Z" },
        ]}
      />,
    )
    expect(screen.getByText("OK")).toBeInTheDocument()
    expect(screen.getByText("đài đã gỡ yêu cầu này")).toBeInTheDocument()
    expect(screen.getByText("H1")).toBeInTheDocument()
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument() // history badge, H2 unbadged
  })
})
