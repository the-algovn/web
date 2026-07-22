import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@algovn/api"
import type { RequestApi } from "../../lib/request-client"
import { RequestModal } from "../request-modal"

function fakeApi(overrides: Partial<RequestApi> = {}): RequestApi {
  return {
    search: vi.fn(async () => [
      { ytId: "a", title: "Bài A", channel: "Ca Sĩ - Topic", durationS: 245 },
      { ytId: "b", title: "Bài B", durationS: 180 },
    ]),
    requestTrack: vi.fn(async () => ({
      id: "r1", source: "listener" as const, ytId: "a", title: "Bài A",
      durationS: 245, status: "approved" as const, createdAt: "2026-07-22T01:00:00Z",
    })),
    myRequests: vi.fn(async () => []),
    ...overrides,
  }
}

describe("RequestModal", () => {
  it("searches, shows candidates, requests one, confirms", async () => {
    const api = fakeApi()
    const onRequested = vi.fn()
    render(
      <RequestModal api={api} token="tok" open onClose={() => {}} onRequested={onRequested} />,
    )
    await userEvent.type(screen.getByRole("searchbox"), "bài a")
    await userEvent.click(screen.getByRole("button", { name: "Tìm" }))
    await waitFor(() => expect(screen.getByText("Bài A")).toBeInTheDocument())
    expect(screen.getByText("4:05")).toBeInTheDocument() // 245s formatted

    await userEvent.click(
      screen.getAllByRole("button", { name: "Yêu cầu" })[0]!,
    )
    await waitFor(() =>
      expect(screen.getByText("đã vào hàng đợi")).toBeInTheDocument(),
    )
    expect(api.requestTrack).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ ytId: "a" }),
    )
    expect(onRequested).toHaveBeenCalled()
  })

  it("renders the server's friendly reject as the station talking", async () => {
    const api = fakeApi({
      requestTrack: vi.fn(async () => {
        throw new ApiError(429, "resource_exhausted", "bạn đang có ba bài chờ phát rồi, đợi chút nha")
      }),
    })
    render(
      <RequestModal api={api} token="tok" open onClose={() => {}} onRequested={() => {}} />,
    )
    await userEvent.type(screen.getByRole("searchbox"), "x")
    await userEvent.click(screen.getByRole("button", { name: "Tìm" }))
    await waitFor(() => expect(screen.getByText("Bài A")).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole("button", { name: "Yêu cầu" })[0]!)
    await waitFor(() =>
      expect(
        screen.getByText("bạn đang có ba bài chờ phát rồi, đợi chút nha"),
      ).toBeInTheDocument(),
    )
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <RequestModal api={fakeApi()} token="tok" open={false} onClose={() => {}} onRequested={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("resets query/results/notice on reopen after a stale close", async () => {
    const api = fakeApi()
    const { rerender } = render(
      <RequestModal api={api} token="tok" open onClose={() => {}} onRequested={() => {}} />,
    )
    await userEvent.type(screen.getByRole("searchbox"), "bài a")
    await userEvent.click(screen.getByRole("button", { name: "Tìm" }))
    await waitFor(() => expect(screen.getByText("Bài A")).toBeInTheDocument())

    rerender(
      <RequestModal api={api} token="tok" open={false} onClose={() => {}} onRequested={() => {}} />,
    )
    rerender(
      <RequestModal api={api} token="tok" open onClose={() => {}} onRequested={() => {}} />,
    )

    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(screen.queryByText("Bài A")).not.toBeInTheDocument()
    expect(screen.queryByText("đã vào hàng đợi")).not.toBeInTheDocument()
  })
})
