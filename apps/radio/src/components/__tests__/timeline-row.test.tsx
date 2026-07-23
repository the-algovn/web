import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { TimelineEntry } from "../../lib/timeline"
import { TimelineRow } from "../timeline-row"

const NOW = Date.parse("2026-07-23T15:20:00.000Z")

const entry = (over: Partial<TimelineEntry> = {}): TimelineEntry => ({
  key: "k",
  zone: "future",
  title: "Nắng Ấm Xa Dần",
  witnessed: false,
  ...over,
})

const row = (e: TimelineEntry) => <TimelineRow entry={e} nowMs={NOW} />

describe("TimelineRow", () => {
  it("marks a queued dedication with a gift and never names the recipient", () => {
    render(row(entry({ hasDedication: true })))
    expect(screen.getByLabelText("có lời nhắn gửi")).toHaveTextContent("🎁")
    expect(screen.queryByText(/gửi/i)).not.toBeInTheDocument()
  })

  it("credits a listener request", () => {
    render(row(entry({ source: "listener", requestedByName: "Ngọc" })))
    expect(screen.getByText("Yêu cầu · Ngọc")).toBeInTheDocument()
  })

  it("credits the DJ", () => {
    render(row(entry({ source: "ai" })))
    expect(screen.getByText("Tiểu Dương Dương chọn")).toBeInTheDocument()
  })

  it("hides the reason until expanded", async () => {
    render(row(entry({ source: "ai", reason: "trời đang mưa" })))
    expect(screen.queryByText("trời đang mưa")).not.toBeInTheDocument()

    const toggle = screen.getByRole("button", { expanded: false })
    await userEvent.click(toggle)
    expect(screen.getByText("trời đang mưa")).toBeInTheDocument()
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument()
  })

  it("reveals a witnessed dedication only on a past entry", async () => {
    render(
      row(
        entry({
          zone: "past",
          witnessed: true,
          dedication: "gửi Linh, chúc ngủ ngon",
          airedAt: "2026-07-23T15:14:00.000Z",
        }),
      ),
    )
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByText("gửi Linh, chúc ngủ ngon")).toBeInTheDocument()
  })

  it("never reveals a dedication for a future entry, even if one leaks in", async () => {
    render(
      row(entry({ zone: "future", hasDedication: true, dedication: "leak" })),
    )
    await userEvent.click(screen.getByRole("button"))
    expect(screen.queryByText("leak")).not.toBeInTheDocument()
  })

  it("shows the status of a pending request", () => {
    render(row(entry({ zone: "pending", status: "ready" })))
    expect(screen.getByText("sẵn sàng")).toBeInTheDocument()
  })

  it("stamps a past entry with a relative time, not a wall clock", () => {
    // NOW is 15:20; the entry aired at 15:14.
    render(row(entry({ zone: "past", airedAt: "2026-07-23T15:14:00.000Z" })))
    expect(screen.getByText("6 phút trước")).toBeInTheDocument()
    expect(screen.queryByText("15:14")).not.toBeInTheDocument()
  })
})
