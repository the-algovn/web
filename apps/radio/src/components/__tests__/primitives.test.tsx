import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ConnectionBadge } from "../connection-badge"
import { ListenerCount } from "../listener-count"
import { DedicationQuote, Eyebrow, TrackArt } from "../primitives"
import { ProgressBar, ProgressClock } from "../progress-bar"

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

describe("ProgressClock", () => {
  it("counts the remainder down rather than up", () => {
    render(
      <ProgressClock progress={{ elapsedS: 84, remainingS: 137, fraction: 0.4 }} />,
    )
    expect(screen.getByText("1:24")).toBeInTheDocument()
    expect(screen.getByText("−2:17")).toBeInTheDocument()
  })
})

describe("ConnectionBadge", () => {
  it("stays silent while the connection is healthy", () => {
    const { container } = render(<ConnectionBadge mode="live" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("speaks up when the page is degraded", () => {
    render(<ConnectionBadge mode="polling" />)
    expect(screen.getByText("CẬP NHẬT CHẬM")).toBeInTheDocument()
  })

  it("reports a lost connection", () => {
    render(<ConnectionBadge mode="offline" />)
    expect(screen.getByText("MẤT KẾT NỐI")).toBeInTheDocument()
  })
})

describe("ListenerCount", () => {
  it("labels the count for screen readers", () => {
    render(<ListenerCount count={7} />)
    expect(screen.getByLabelText("7 người đang nghe")).toHaveTextContent("7")
  })
})

describe("Eyebrow", () => {
  it("renders its label", () => {
    render(<Eyebrow>ĐANG PHÁT</Eyebrow>)
    expect(screen.getByText("ĐANG PHÁT")).toBeInTheDocument()
  })
})

describe("TrackArt", () => {
  it("falls back to the woven placeholder when there is no cover", () => {
    render(<TrackArt size={44} label="ẢNH BÌA" />)
    expect(screen.getByText("ẢNH BÌA")).toBeInTheDocument()
  })

  it("drops the placeholder label once real art arrives", () => {
    render(<TrackArt size={44} label="ẢNH BÌA" src="https://img/x" />)
    expect(screen.queryByText("ẢNH BÌA")).not.toBeInTheDocument()
  })
})

describe("DedicationQuote", () => {
  it("shows the message and who sent it", () => {
    render(<DedicationQuote message="gửi mẹ" attribution="Ngọc" />)
    expect(screen.getByText("gửi mẹ")).toBeInTheDocument()
    expect(screen.getByText("Ngọc")).toBeInTheDocument()
  })
})
