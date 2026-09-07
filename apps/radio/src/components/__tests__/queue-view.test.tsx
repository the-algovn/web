import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { HistoryItem, QueueItem } from "../../lib/radio-client"
import type { TrackRequest } from "../../lib/request-client"
import { QueueView, type QueueFilter } from "../queue-view"

const queue: QueueItem[] = [
  {
    title: "Diễm Xưa",
    artist: "Khánh Ly",
    hasDedication: true,
    source: "listener",
    requestedByName: "Toni",
  },
  { title: "Green Onions", artist: "Booker T.", hasDedication: false, source: "ai" },
]

const history: HistoryItem[] = [
  {
    title: "Cuban Fantasy",
    artist: "Cal Tjader",
    airedAt: "2026-07-22T01:36:00Z",
    source: "listener",
    requestedByName: "Devi",
    dedication: "Gửi anh trai lái xe suốt đêm.",
  },
]

const mine: TrackRequest[] = [
  {
    id: "r1",
    source: "listener",
    ytId: "y1",
    title: "Không",
    channel: "Elvis Phương",
    durationS: 232,
    status: "ready",
    createdAt: "2026-07-22T01:00:00Z",
    dedication: "Cho ca đêm ở quán phở.",
  },
]

function setup(filter: QueueFilter, over: Partial<Parameters<typeof QueueView>[0]> = {}) {
  const onFilter = vi.fn()
  render(
    <QueueView
      layout="phone"
      filter={filter}
      onFilter={onFilter}
      queue={queue}
      history={history}
      mine={mine}
      signedIn
      onRequest={vi.fn()}
      onSignIn={vi.fn()}
      {...over}
    />,
  )
  return { onFilter }
}

describe("QueueView", () => {
  it("seals a queued dedication: it says one exists, never what it says", () => {
    setup("next")
    expect(screen.getByText(/CÓ LỜI NHẮN/)).toBeInTheDocument()
    expect(screen.getByText("Diễm Xưa")).toBeInTheDocument()
    expect(screen.queryByText(/Gửi anh trai/)).not.toBeInTheDocument()
  })

  it("credits the station for its own picks", () => {
    setup("next")
    expect(screen.getByText("ĐÀI CHỌN")).toBeInTheDocument()
  })

  it("reveals the dedication once the track has aired", () => {
    setup("played")
    expect(screen.getByText("Gửi anh trai lái xe suốt đêm.")).toBeInTheDocument()
    expect(screen.getByText("Devi")).toBeInTheDocument()
  })

  it("shows the listener their own request status and words", () => {
    setup("mine")
    expect(screen.getByText("Không")).toBeInTheDocument()
    expect(screen.getByText("SẴN SÀNG")).toBeInTheDocument()
    expect(screen.getByText("3:52")).toBeInTheDocument()
    expect(screen.getByText("Cho ca đêm ở quán phở.")).toBeInTheDocument()
  })

  it("spells out why a request will not air", () => {
    setup("mine", {
      mine: [
        {
          ...(mine[0] as TrackRequest),
          status: "failed",
          failReason: "bài dài quá mười phút",
        },
      ],
    })
    expect(
      screen.getByText("KHÔNG PHÁT ĐƯỢC · bài dài quá mười phút"),
    ).toBeInTheDocument()
  })

  it("switches filter on tab press", () => {
    const { onFilter } = setup("next")
    fireEvent.click(screen.getByRole("tab", { name: "CỦA BẠN" }))
    expect(onFilter).toHaveBeenCalledWith("mine")
  })

  it("marks the active filter for assistive tech", () => {
    setup("played")
    expect(screen.getByRole("tab", { name: "VỪA PHÁT" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "SẮP PHÁT" })).toHaveAttribute(
      "aria-selected",
      "false",
    )
  })

  it("turns an empty MINE into an invitation, not a dead end", () => {
    setup("mine", { mine: [] })
    expect(screen.getByText("Bạn chưa yêu cầu bài nào.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "YÊU CẦU BÀI HÁT" }),
    ).toBeInTheDocument()
  })

  it("asks an anonymous listener to sign in from the empty MINE", () => {
    setup("mine", { mine: [], signedIn: false })
    expect(screen.getByRole("button", { name: "ĐĂNG NHẬP" })).toBeInTheDocument()
  })
})
