import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../../lib/api"
import { Library } from "../library"

vi.mock("../../lib/api", () => ({
  labCall: vi.fn(),
  artifactUrl: (id: string) => `https://artifacts.test/${id}`,
}))
vi.mock("../../lib/use-auth", () => ({
  useAuth: () => ({ token: "test-token" }),
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const mockedLabCall = vi.mocked(labCall)
const mockedToastError = vi.mocked(toast.error)

const track = {
  ytId: "abc123",
  title: "Em của ngày hôm qua",
  channel: "Sơn Tùng M-TP",
  durationS: 240,
  artifactId: "art-1",
  inputI: -14.2,
  inputTp: -1.5,
  inputLra: 6,
  addedAt: "2026-07-20T00:00:00Z",
}

describe("Library", () => {
  beforeEach(() => {
    mockedLabCall.mockReset()
    mockedToastError.mockReset()
  })

  it("searches the library and renders results", async () => {
    mockedLabCall.mockResolvedValueOnce({ tracks: [track] })

    render(<Library />)
    fireEvent.change(screen.getByPlaceholderText("title or channel"), { target: { value: "sơn tùng" } })
    fireEvent.click(screen.getByText("Search"))

    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/library/list", { query: "sơn tùng", limit: 50 })
  })

  it("deletes a track and refetches the list", async () => {
    mockedLabCall
      .mockResolvedValueOnce({ tracks: [track] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ tracks: [] })

    render(<Library />)
    fireEvent.click(screen.getByText("Search"))
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())

    fireEvent.click(screen.getByText("Delete"))

    await waitFor(() => expect(screen.queryByText("Em của ngày hôm qua")).not.toBeInTheDocument())
    expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/library/delete", { ytId: "abc123" })
  })

  it("shows a toast and keeps the row when delete fails", async () => {
    mockedLabCall.mockResolvedValueOnce({ tracks: [track] }).mockRejectedValueOnce(new Error("boom"))

    render(<Library />)
    fireEvent.click(screen.getByText("Search"))
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())

    fireEvent.click(screen.getByText("Delete"))

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith("boom"))
    expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument()
    expect(screen.getByText("Delete")).not.toBeDisabled()
  })
})
