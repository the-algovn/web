import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Candidate, TrackRequest } from "../lib/request-client"

const search = vi.fn()
const requestTrack = vi.fn()
const myRequests = vi.fn()

// App builds its own request API and reads auth from the OIDC manager, so
// both are replaced at the module boundary rather than injected.
vi.mock("../lib/request-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/request-client")>()),
  createRequestApi: () => ({ search, requestTrack, myRequests }),
}))

vi.mock("../lib/use-auth", () => ({
  useAuth: () => ({
    user: { profile: { name: "Ngọc" } },
    token: "tok",
  }),
}))

import App from "../App"
import { MockStudio } from "../lib/mock-studio"
import { createFakePlayer } from "../lib/player"

const candidate: Candidate = {
  ytId: "y1",
  title: "Diễm Xưa",
  channel: "Khánh Ly",
  durationS: 271,
}

const created: TrackRequest = {
  id: "r1",
  source: "listener",
  ytId: "y1",
  title: "Diễm Xưa",
  channel: "Khánh Ly",
  durationS: 271,
  status: "approved",
  createdAt: "2026-07-22T01:00:00Z",
}

async function mount() {
  const client = new MockStudio({
    now: () => 1_700_000_000_000,
    random: () => 0.5,
  })
  render(
    <App
      deps={{
        client,
        createPlayer: () => createFakePlayer(),
        playheadClock: () => 1_700_000_000_000,
      }}
    />,
  )
  await act(async () => {
    await Promise.resolve()
  })
}

async function searchAndPick() {
  fireEvent.click(screen.getByRole("button", { name: "YÊU CẦU" }))
  fireEvent.change(screen.getByLabelText("Tên bài hát, ca sĩ"), {
    target: { value: "diễm xưa" },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }))
  })
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Diễm Xưa/ }))
  })
}

describe("request flow (signed in)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search.mockResolvedValue([candidate])
    requestTrack.mockResolvedValue(created)
    myRequests.mockResolvedValue([])
  })

  it("carries the listener's dedication all the way to the station", async () => {
    await mount()
    await searchAndPick()

    fireEvent.change(screen.getByLabelText("Lời nhắn"), {
      target: { value: "  Gửi mẹ, sinh nhật vui vẻ  " },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "GỬI LÊN ĐÀI" }))
    })

    expect(requestTrack).toHaveBeenCalledWith(
      "tok",
      candidate,
      "Gửi mẹ, sinh nhật vui vẻ",
    )
    expect(screen.getByRole("status")).toHaveTextContent("ĐÃ GỬI LÊN ĐÀI")
    expect(screen.getByText("Gửi mẹ, sinh nhật vui vẻ")).toBeInTheDocument()
  })

  it("sends no dedication when the listener turns off reading it on air", async () => {
    await mount()
    await searchAndPick()

    fireEvent.change(screen.getByLabelText("Lời nhắn"), {
      target: { value: "riêng tư" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: /đọc lời nhắn trên sóng/i }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "GỬI LÊN ĐÀI" }))
    })

    expect(requestTrack).toHaveBeenCalledWith("tok", candidate, "")
  })

  it("keeps the listener in compose when the station rejects the request", async () => {
    requestTrack.mockRejectedValue(new Error("bài này đang trong hàng đợi rồi"))
    await mount()
    await searchAndPick()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "GỬI LÊN ĐÀI" }))
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "bài này đang trong hàng đợi rồi",
    )
    // Still in compose - nothing was lost and it can be retried.
    expect(screen.getByLabelText("Lời nhắn")).toBeInTheDocument()
    expect(screen.queryByText("ĐÃ GỬI LÊN ĐÀI")).toBeNull()
  })

  it("routes from the confirmation to the listener's own requests", async () => {
    myRequests.mockResolvedValue([{ ...created, dedication: "Gửi mẹ" }])
    await mount()
    await searchAndPick()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "GỬI LÊN ĐÀI" }))
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "XEM HÀNG ĐỢI" }))
    })

    const queue = screen.getByRole("region", { name: "Hàng đợi của đài" })
    expect(within(queue).getByRole("tab", { name: "CỦA BẠN" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(within(queue).getByText("ĐANG CHỜ")).toBeInTheDocument()
  })
})
