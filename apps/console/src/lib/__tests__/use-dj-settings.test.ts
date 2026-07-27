import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall, radioCall } from "../api"
import { formFromWire, useDJSettings } from "../use-dj-settings"

vi.mock("../api", () => ({ labCall: vi.fn(), radioCall: vi.fn() }))
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
})

describe("useDJSettings", () => {
  it("loads settings + voices and filters the fake entry out", async () => {
    mockedRadio.mockResolvedValue({ dj: fullDj })
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockedRadio).toHaveBeenCalledWith("tok", "/station")
    expect(mockedLab).toHaveBeenCalledWith("tok", "/voices")
    expect(result.current.form.voiceId).toBe("vi-VN-Chirp3-HD-Aoede")
    expect(result.current.voices.map((v) => v.id)).toEqual(["vi-VN-Chirp3-HD-Aoede", "vi-VN-Neural2-A"])
    expect(result.current.dirty).toBe(false)
  })

  it("seeds 0 for protojson-omitted numerics on load", async () => {
    mockedRadio.mockResolvedValue({ dj: { voiceId: "vi-VN-Neural2-A", speakingRate: 1.2, maxChars: 300 } })
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.form.breakEvery).toBe(0)
    expect(result.current.form.stationIdMin).toBe(0)
  })

  it("survives a response with dj absent entirely", async () => {
    mockedRadio.mockResolvedValue({ station: { onAir: false } })
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.form).toEqual(formFromWire(undefined))
  })

  it("saves the full settings payload and reseeds from the response (absent → 0)", async () => {
    mockedRadio.mockResolvedValueOnce({ dj: fullDj }) // mount
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setForm({ ...result.current.form, voiceId: "vi-VN-Neural2-A", breakEvery: 0 }))
    expect(result.current.dirty).toBe(true)

    // Server echoes: breakEvery 0 is OMITTED by protojson.
    mockedRadio.mockResolvedValueOnce({
      settings: { voiceId: "vi-VN-Neural2-A", speakingRate: 1, stationIdMin: 60, maxChars: 450 },
    })
    await act(() => result.current.save())
    expect(mockedRadio).toHaveBeenLastCalledWith("tok", "/station/dj", {
      settings: { voiceId: "vi-VN-Neural2-A", speakingRate: 1, breakEvery: 0, stationIdMin: 60, maxChars: 450 },
    })
    expect(result.current.form.breakEvery).toBe(0)
    expect(result.current.dirty).toBe(false)
  })

  it("keeps edits and toasts on save failure", async () => {
    mockedRadio.mockResolvedValueOnce({ dj: fullDj })
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setForm({ ...result.current.form, speakingRate: 1.3 }))
    mockedRadio.mockRejectedValueOnce(new Error("speaking_rate must be between 0.7 and 1.3"))
    await act(() => result.current.save())
    expect(toast.error).toHaveBeenCalledWith("speaking_rate must be between 0.7 and 1.3")
    expect(result.current.form.speakingRate).toBe(1.3)
    expect(result.current.dirty).toBe(true)
  })

  it("previews via the lab synth endpoint and records the take", async () => {
    mockedRadio.mockResolvedValue({ dj: fullDj })
    const { result } = renderHook(() => useDJSettings("tok"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockedLab.mockResolvedValueOnce({ artifact: { id: "art-9" }, costUsd: 0.0012, fake: true })
    await act(() => result.current.preview("xin chào"))
    expect(mockedLab).toHaveBeenLastCalledWith("tok", "/voice/synthesize", {
      text: "xin chào",
      voiceId: "vi-VN-Chirp3-HD-Aoede",
      speakingRate: 1,
      label: "dj-preview",
    })
    expect(result.current.take).toEqual({ artifactId: "art-9", costUsd: 0.0012, fake: true })
  })
})
