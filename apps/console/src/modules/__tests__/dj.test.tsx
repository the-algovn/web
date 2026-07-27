import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall, radioCall } from "../../lib/api"
import { DJ } from "../dj"

vi.mock("../../lib/api", () => ({
  labCall: vi.fn(),
  radioCall: vi.fn(),
  presignArtifact: vi.fn(async (_t: string, id: string) => ({ url: `https://artifacts.test/${id}` })),
}))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "test-token" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockedLab = vi.mocked(labCall)
const mockedRadio = vi.mocked(radioCall)

const voices = {
  voices: [
    { id: "vi-VN-Chirp3-HD-Aoede", label: "Chirp3 HD — Aoede (nữ)", tier: "chirp3-hd" },
    { id: "vi-VN-Neural2-A", label: "Neural2 A (nữ)", tier: "neural2" },
    { id: "fake", label: "Fake (no key)", tier: "fake" },
  ],
}
const fullDj = { voiceId: "vi-VN-Chirp3-HD-Aoede", speakingRate: 1, breakEvery: 2, stationIdMin: 60, maxChars: 450 }

beforeEach(() => {
  mockedLab.mockReset()
  mockedRadio.mockReset()
  vi.mocked(toast.error).mockReset()
  mockedLab.mockResolvedValue(voices)
  mockedRadio.mockResolvedValue({ dj: fullDj })
})

describe("DJ", () => {
  it("loads settings, lists voices without the fake entry", async () => {
    render(<DJ />)
    const select = (await screen.findByLabelText("Voice")) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe("vi-VN-Chirp3-HD-Aoede"))
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toContain("vi-VN-Neural2-A")
    expect(options).not.toContain("fake")
    expect(screen.getByText("chirp3-hd")).toBeInTheDocument() // tier badge for selection
  })

  it("saves the edited settings", async () => {
    render(<DJ />)
    const select = await screen.findByLabelText("Voice")
    await waitFor(() => expect((select as HTMLSelectElement).value).toBe("vi-VN-Chirp3-HD-Aoede"))
    fireEvent.change(select, { target: { value: "vi-VN-Neural2-A" } })
    fireEvent.change(screen.getByLabelText("Break every (tracks, 0 = off)"), { target: { value: "3" } })
    mockedRadio.mockResolvedValueOnce({
      settings: { voiceId: "vi-VN-Neural2-A", speakingRate: 1, breakEvery: 3, stationIdMin: 60, maxChars: 450 },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(mockedRadio).toHaveBeenLastCalledWith("test-token", "/station/dj", {
        settings: { voiceId: "vi-VN-Neural2-A", speakingRate: 1, breakEvery: 3, stationIdMin: 60, maxChars: 450 },
      }),
    )
  })

  it("save button is disabled until the form is dirty", async () => {
    render(<DJ />)
    await screen.findByLabelText("Voice")
    await waitFor(() =>
      expect((screen.getByLabelText("Voice") as HTMLSelectElement).value).toBe("vi-VN-Chirp3-HD-Aoede"),
    )
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Break every (tracks, 0 = off)"), { target: { value: "5" } })
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled()
  })

  it("previews the selected voice and renders the player + fake badge", async () => {
    render(<DJ />)
    // Preview is disabled until the form loads a voice — wait for the seed.
    await waitFor(() =>
      expect((screen.getByLabelText("Voice") as HTMLSelectElement).value).toBe("vi-VN-Chirp3-HD-Aoede"),
    )
    mockedLab.mockResolvedValueOnce({ artifact: { id: "art-9" }, costUsd: 0.0012, fake: true })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    await waitFor(() =>
      expect(mockedLab).toHaveBeenLastCalledWith(
        "test-token",
        "/voice/synthesize",
        expect.objectContaining({ voiceId: "vi-VN-Chirp3-HD-Aoede", label: "dj-preview" }),
      ),
    )
    await waitFor(() => expect(document.querySelector("audio")).not.toBeNull())
    expect(screen.getByText("fake (no key)")).toBeInTheDocument()
  })

  it("toasts and keeps edits on save failure", async () => {
    render(<DJ />)
    const select = await screen.findByLabelText("Voice")
    await waitFor(() => expect((select as HTMLSelectElement).value).toBe("vi-VN-Chirp3-HD-Aoede"))
    fireEvent.change(select, { target: { value: "vi-VN-Neural2-A" } })
    mockedRadio.mockRejectedValueOnce(new Error("boom"))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
    expect((screen.getByLabelText("Voice") as HTMLSelectElement).value).toBe("vi-VN-Neural2-A")
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled()
  })
})
