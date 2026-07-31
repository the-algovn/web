import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../../lib/api"
import { BrainPlayground } from "../brain-playground"

vi.mock("../../lib/api", () => ({ labCall: vi.fn() }))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "test-token" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockedLabCall = vi.mocked(labCall)

beforeEach(() => {
  mockedLabCall.mockReset()
  vi.mocked(toast.error).mockReset()
  mockedLabCall.mockImplementation(async (_t, path) => {
    if (path === "/persona") return { content: "" }
    if (path === "/voices") return { voices: [] }
    if (path === "/brain/script") {
      return { script: "…", model: "script", inTokens: 10, outTokens: 5, costUsd: 0.001 }
    }
    return {}
  })
})

// A helper to pull the args of the last "/brain/script" call.
function lastScriptCallBody() {
  const calls = mockedLabCall.mock.calls.filter(([, path]) => path === "/brain/script")
  return calls.pop()?.[2] as { briefJson: string; model: string; personaOverride: string }
}

describe("BrainPlayground", () => {
  it("posts briefJson (director field order, just_played, coming_up) with model defaulted to script", async () => {
    render(<BrainPlayground />)
    await waitFor(() => expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/persona"))

    fireEvent.click(screen.getByRole("button", { name: "Generate script" }))
    await waitFor(() => expect(lastScriptCallBody()).toBeDefined())

    const body = lastScriptCallBody()
    // The typed `brief` message drifted from the Go struct and is gone — the
    // bench now posts the director's brief verbatim as a JSON string, plus
    // model + personaOverride.
    expect(Object.keys(body)).toEqual(["briefJson", "model", "personaOverride"])
    expect(body.model).toBe("script")

    const brief = JSON.parse(body.briefJson) as Record<string, unknown>
    // Field order must match the director's Brief struct verbatim, since the
    // server forwards brief_json byte-for-byte.
    expect(Object.keys(brief)).toEqual([
      "type",
      "local_time",
      "daypart",
      "on_air_for_min",
      "listeners",
      "just_played",
      "max_chars",
      "coming_up",
    ])
    expect(brief.type).toBe("seam")
    expect(brief.just_played).toEqual({ title: "Lạc Trôi", artist: "Sơn Tùng M-TP" })
    expect(brief.coming_up).toEqual({ title: "Em Của Ngày Hôm Qua", artist: "Sơn Tùng M-TP" })
  })

  it("omits coming_up (rather than sending it empty) when there is no next title", async () => {
    render(<BrainPlayground />)
    await waitFor(() => expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/persona"))

    fireEvent.change(screen.getByPlaceholderText("coming up title (optional)"), {
      target: { value: "" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Generate script" }))
    await waitFor(() => expect(lastScriptCallBody()).toBeDefined())

    const brief = JSON.parse(lastScriptCallBody().briefJson) as Record<string, unknown>
    expect(brief).not.toHaveProperty("coming_up")
  })
})
