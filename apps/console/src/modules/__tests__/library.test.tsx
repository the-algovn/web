import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../../lib/api"
import { createFakeAudio } from "../../test-utils/fake-audio"
import { Library } from "../library"

vi.mock("../../lib/api", () => ({
  labCall: vi.fn(),
  artifactUrl: (id: string) => `https://artifacts.test/${id}`,
  presignArtifact: vi.fn(async (_t: string, id: string) => ({
    url: `https://artifacts.test/${id}`,
  })),
}))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "test-token" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockedLabCall = vi.mocked(labCall)

const track = {
  ytId: "abc123",
  title: "Em của ngày hôm qua",
  channel: "Sơn Tùng M-TP",
  durationS: "240",
  artifactId: "art-1",
  inputI: -14.2,
  addedAt: "2026-07-20T00:00:00Z",
}

function renderLibrary() {
  return render(<Library audio={createFakeAudio() as unknown as HTMLAudioElement} />)
}

beforeEach(() => {
  mockedLabCall.mockReset()
  vi.mocked(toast.error).mockReset()
})

describe("Library", () => {
  it("auto-loads the list on mount and renders rows", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "1" })
    renderLibrary()
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/library/list", {
      query: "",
      limit: 20,
      offset: 0,
    })
    expect(screen.getByText("4:00")).toBeInTheDocument() // duration formatted
  })

  it("changes the page offset when Next is clicked", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "40" })
    renderLibrary()
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Next"))
    await waitFor(() =>
      expect(mockedLabCall).toHaveBeenLastCalledWith("test-token", "/library/list", {
        query: "",
        limit: 20,
        offset: 20,
      }),
    )
  })

  it("loads the transport and shows the title when a row's play button is clicked", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "1" })
    renderLibrary()
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Play Em của ngày hôm qua"))
    // The docked transport now shows a Pause control AND the loaded track's
    // title — scoped to the transport so the table row's title isn't matched.
    // Pause appears after the async presign resolves the playable URL.
    const bar = await screen.findByTestId("transport-bar")
    await within(bar).findByLabelText("Pause")
    expect(within(bar).getByText("Em của ngày hôm qua")).toBeInTheDocument()
  })

  it("shows an empty state when there are no tracks", async () => {
    mockedLabCall.mockResolvedValue({ tracks: [], total: "0" })
    renderLibrary()
    await waitFor(() => expect(screen.getByText("No tracks match.")).toBeInTheDocument())
  })

  it("keeps the delete button re-enabled after a failed delete", async () => {
    mockedLabCall
      .mockResolvedValueOnce({ tracks: [track], total: "1" }) // mount
      .mockRejectedValueOnce(new Error("boom")) // delete
    renderLibrary()
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Delete Em của ngày hôm qua"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
    expect(screen.getByLabelText("Delete Em của ngày hôm qua")).not.toBeDisabled()
  })

  it("stops the transport when the playing track is deleted", async () => {
    // mockResolvedValue (not ...Once): the post-delete refetch also resolves.
    // The row reappears but the player stays stopped because del() called
    // player.stop() before lib.del(), clearing the loaded track.
    mockedLabCall.mockResolvedValue({ tracks: [track], total: "1" })
    renderLibrary()
    await waitFor(() => expect(screen.getByText("Em của ngày hôm qua")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Play Em của ngày hôm qua"))
    await waitFor(() => expect(screen.getByLabelText("Pause")).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText("Delete Em của ngày hôm qua"))
    await waitFor(() => expect(screen.getByText("Nothing playing")).toBeInTheDocument())
    expect(screen.queryByLabelText("Pause")).toBeNull()
  })

  it("renders the Skeleton, not the EmptyState, until the first fetch resolves", async () => {
    let resolve: (v: { tracks: never[]; total: string }) => void = () => {}
    mockedLabCall.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { container } = renderLibrary()
    // precedence (a): Skeleton shows, EmptyState absent while loading.
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText("No tracks match.")).toBeNull()
    // precedence (b): EmptyState appears only after an empty fetch resolves.
    resolve({ tracks: [], total: "0" })
    await waitFor(() => expect(screen.getByText("No tracks match.")).toBeInTheDocument())
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)
  })
})
