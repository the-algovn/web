import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Candidate } from "../../lib/request-client"
import { RequestView } from "../request-view"

const results: Candidate[] = [
  { ytId: "y1", title: "Diễm Xưa", channel: "Khánh Ly", durationS: 271 },
  { ytId: "y2", title: "Mưa Hồng", channel: "Khánh Ly", durationS: 224 },
]

type Props = Parameters<typeof RequestView>[0]

function setup(over: Partial<Props> = {}) {
  const handlers = {
    onQuery: vi.fn(),
    onSubmit: vi.fn(),
    onClear: vi.fn(),
    onSignIn: vi.fn(),
    onPick: vi.fn(),
  }
  render(
    <RequestView
      layout="phone"
      query=""
      busy={false}
      searched={false}
      results={[]}
      error={null}
      signedIn
      {...handlers}
      {...over}
    />,
  )
  return handlers
}

describe("RequestView", () => {
  it("gates search behind sign-in rather than showing a dead field", () => {
    setup({ signedIn: false })
    expect(screen.queryByLabelText("Tên bài hát, ca sĩ")).toBeNull()
    expect(screen.getByRole("button", { name: "ĐĂNG NHẬP" })).toBeInTheDocument()
  })

  it("searches on submit, not on every keystroke", () => {
    const { onSubmit, onQuery } = setup({ query: "diễm" })
    fireEvent.change(screen.getByLabelText("Tên bài hát, ca sĩ"), {
      target: { value: "diễm x" },
    })
    expect(onQuery).toHaveBeenCalledWith("diễm x")
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Tìm" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("offers CLEAR only once there is something to clear", () => {
    setup()
    expect(screen.queryByRole("button", { name: "XOÁ" })).toBeNull()
    const { onClear } = setup({ query: "diễm" })
    fireEvent.click(screen.getAllByRole("button", { name: "XOÁ" })[0] as HTMLElement)
    expect(onClear).toHaveBeenCalled()
  })

  it("lists results with their duration and hands the pick upward", () => {
    const { onPick } = setup({ query: "khánh ly", results, searched: true })
    expect(screen.getByText("2 KẾT QUẢ")).toBeInTheDocument()
    expect(screen.getByText("4:31")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Diễm Xưa/ }))
    expect(onPick).toHaveBeenCalledWith(results[0])
  })

  it("says nothing was found only after a search actually ran", () => {
    setup()
    expect(screen.queryByText("Không tìm thấy bài này.")).toBeNull()
    expect(screen.getByText(/Gõ tên bài hoặc ca sĩ/)).toBeInTheDocument()

    setup({ query: "zzz", searched: true })
    expect(screen.getByText("Không tìm thấy bài này.")).toBeInTheDocument()
  })

  it("shows the station's error instead of an empty-results story", () => {
    setup({ query: "zzz", searched: true, error: "đài đang bận, thử lại nhé" })
    expect(screen.getByText("đài đang bận, thử lại nhé")).toBeInTheDocument()
    expect(screen.queryByText("Không tìm thấy bài này.")).toBeNull()
  })
})
