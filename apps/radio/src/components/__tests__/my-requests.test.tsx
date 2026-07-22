import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TrackRequest } from "../../lib/request-client"
import { MyRequests } from "../my-requests"

const req = (status: TrackRequest["status"], failReason?: string): TrackRequest => {
  const r: TrackRequest = {
    id: "r-" + status, source: "listener", ytId: "y", title: "Bài " + status,
    durationS: 100, status, createdAt: "2026-07-22T01:00:00Z",
  }
  if (failReason) r.failReason = failReason
  return r
}

describe("MyRequests", () => {
  it("renders each status with its Vietnamese label", () => {
    render(
      <MyRequests
        requests={[req("approved"), req("ready"), req("aired"), req("failed", "yt-dlp: 403")]}
      />,
    )
    expect(screen.getByText("chờ tải")).toBeInTheDocument()
    expect(screen.getByText("sẵn sàng")).toBeInTheDocument()
    expect(screen.getByText("đã phát")).toBeInTheDocument()
    expect(screen.getByText("lỗi")).toBeInTheDocument()
  })

  it("renders nothing when empty", () => {
    const { container } = render(<MyRequests requests={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
