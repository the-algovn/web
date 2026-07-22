import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ConnectionBadge } from "../connection-badge"
import { ListenerCount } from "../listener-count"
import { NowMarker } from "../now-marker"
import { ProgressBar } from "../progress-bar"

describe("ProgressBar", () => {
  it("exposes progress to assistive tech as a spoken clock, not a percentage", () => {
    render(
      <ProgressBar progress={{ elapsedS: 50, remainingS: 150, fraction: 0.25 }} />,
    )
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "50")
    expect(bar).toHaveAttribute("aria-valuemax", "200")
    expect(bar).toHaveAttribute("aria-valuetext", "0:50 / 3:20")
  })
})

describe("ConnectionBadge", () => {
  it("stays silent while the connection is healthy", () => {
    const { container } = render(<ConnectionBadge mode="live" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("speaks up when the page is degraded", () => {
    render(<ConnectionBadge mode="polling" />)
    expect(screen.getByText("đang cập nhật chậm")).toBeInTheDocument()
  })

  it("reports a lost connection", () => {
    render(<ConnectionBadge mode="offline" />)
    expect(screen.getByText("mất kết nối")).toBeInTheDocument()
  })
})

describe("ListenerCount", () => {
  it("labels the count for screen readers", () => {
    render(<ListenerCount count={7} />)
    expect(screen.getByLabelText("7 người đang nghe")).toHaveTextContent("7")
  })
})

describe("NowMarker", () => {
  it("shows the live label and the elapsed clock", () => {
    render(<NowMarker elapsedS={84} remainingS={137} />)
    expect(screen.getByText("ĐANG PHÁT")).toBeInTheDocument()
    expect(screen.getByText("1:24 / 3:41")).toBeInTheDocument()
  })
})
