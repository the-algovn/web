import { ApiError } from "@algovn/api"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Candidate, RequestApi, TrackRequest } from "../../lib/request-client"
import { RequestSheet } from "../request-sheet"

const candidate: Candidate = {
  ytId: "y1",
  title: "Nơi Này Có Anh",
  channel: "Sơn Tùng M-TP",
  durationS: 289,
}

const made: TrackRequest = {
  id: "r1",
  source: "listener",
  ytId: "y1",
  title: "Nơi Này Có Anh",
  durationS: 289,
  status: "approved",
  createdAt: "2026-07-23T09:00:00.000Z",
}

function api(over: Partial<RequestApi> = {}): RequestApi {
  return {
    search: vi.fn().mockResolvedValue([candidate]),
    requestTrack: vi.fn().mockResolvedValue(made),
    myRequests: vi.fn().mockResolvedValue([]),
    ...over,
  }
}

describe("RequestSheet", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <RequestSheet
        api={api()}
        token="t"
        open={false}
        onClose={() => {}}
        onRequested={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("searches and lists candidates with a readable duration", async () => {
    render(
      <RequestSheet
        api={api()}
        token="t"
        open
        onClose={() => {}}
        onRequested={() => {}}
      />,
    )
    await userEvent.type(
      screen.getByPlaceholderText("tên bài hát, ca sĩ…"),
      "noi nay{Enter}",
    )
    expect(await screen.findByText("Nơi Này Có Anh")).toBeInTheDocument()
    expect(screen.getByText(/4:49/)).toBeInTheDocument()
  })

  it("submits a request and reports back", async () => {
    const onRequested = vi.fn()
    const a = api()
    render(
      <RequestSheet
        api={a}
        token="t"
        open
        onClose={() => {}}
        onRequested={onRequested}
      />,
    )
    await userEvent.type(
      screen.getByPlaceholderText("tên bài hát, ca sĩ…"),
      "noi nay{Enter}",
    )
    await userEvent.click(await screen.findByRole("button", { name: "Yêu cầu" }))
    await waitFor(() => expect(onRequested).toHaveBeenCalledWith(made))
    expect(screen.getByText("đã vào hàng đợi")).toBeInTheDocument()
  })

  it("renders a server rejection verbatim — the station talking, not a code", async () => {
    // A real ApiError whose message is DISTINCT from messageOf()'s generic
    // fallback ("đài đang bận, thử lại nhé"). If the component ignored
    // e.message and always showed the fallback, this assertion would fail —
    // so it actually proves the verbatim-message path, not just that some
    // notice appears.
    const rejected = "bạn đang có ba bài chờ phát rồi, đợi chút nha"
    const a = api({
      search: vi
        .fn()
        .mockRejectedValue(new ApiError(429, "resource_exhausted", rejected)),
    })
    render(
      <RequestSheet
        api={a}
        token="t"
        open
        onClose={() => {}}
        onRequested={() => {}}
      />,
    )
    await userEvent.type(
      screen.getByPlaceholderText("tên bài hát, ca sĩ…"),
      "x{Enter}",
    )
    expect(await screen.findByText(rejected)).toBeInTheDocument()
    // And the generic fallback must NOT appear — the real message won.
    expect(
      screen.queryByText("đài đang bận, thử lại nhé"),
    ).not.toBeInTheDocument()
  })

  it("closes on Escape, which the old modal could not do", async () => {
    const onClose = vi.fn()
    render(
      <RequestSheet
        api={api()}
        token="t"
        open
        onClose={onClose}
        onRequested={() => {}}
      />,
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
