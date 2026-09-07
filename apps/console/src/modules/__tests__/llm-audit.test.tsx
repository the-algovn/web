import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../../lib/api"
import { LLMAudit } from "../llm-audit"

vi.mock("../../lib/api", () => ({ labCall: vi.fn() }))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "test-token" }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const mockedLabCall = vi.mocked(labCall)

const call = {
  id: "1", ts: "2026-07-27T12:00:00Z", label: "director:seam",
  model: "gemini-2.5-flash", provider: "gemini",
  systemPrompt: "SYSTEM-BODY", userPrompt: "USER-BODY", output: "OUTPUT-BODY",
  inTokens: 100, outTokens: 40, costUsd: 0.0012, latencyMs: 830, fake: false,
}

beforeEach(() => {
  mockedLabCall.mockReset()
  vi.mocked(toast.error).mockReset()
  mockedLabCall.mockImplementation(async (_t, path) => {
    if (path === "/llm-calls/list") return { calls: [call], total: "1" }
    if (path === "/llm-calls/stats") return { stats: [{ label: "director:seam", model: "gemini-2.5-flash", count: 1, costUsd: 0.0012 }], totalUsd: 0.0012 }
    return {}
  })
})

describe("LLMAudit", () => {
  it("loads and lists calls on mount", async () => {
    render(<LLMAudit />)
    await waitFor(() => expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument()) // model cell is unique (label appears in badge + filter option + stat line)
    expect(mockedLabCall).toHaveBeenCalledWith("test-token", "/llm-calls/list", { label: "", errorsOnly: false, correlationId: "", limit: 20, offset: 0 })
    expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument()
  })

  it("filters by call-site when the select changes", async () => {
    render(<LLMAudit />)
    await waitFor(() => expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument()) // model cell is unique (label appears in badge + filter option + stat line)
    fireEvent.change(screen.getByLabelText("Call site"), { target: { value: "programmer:" } })
    await waitFor(() =>
      expect(mockedLabCall).toHaveBeenLastCalledWith("test-token", "/llm-calls/list", { label: "programmer:", errorsOnly: false, correlationId: "", limit: 20, offset: 0 }),
    )
  })

  it("reveals full prompts + output when a row is expanded", async () => {
    render(<LLMAudit />)
    await waitFor(() => expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument()) // model cell is unique (label appears in badge + filter option + stat line)
    fireEvent.click(screen.getByRole("button", { name: /inspect/i }))
    expect(screen.getByText("SYSTEM-BODY")).toBeInTheDocument()
    expect(screen.getByText("USER-BODY")).toBeInTheDocument()
    expect(screen.getByText("OUTPUT-BODY")).toBeInTheDocument()
  })

  it("shows the stats breakdown", async () => {
    render(<LLMAudit />)
    // the combined "label/model: N× $cost" stat line is unique (the total span and
    // the row cost render "$0.0012" too, so match the stat line specifically)
    await waitFor(() =>
      expect(screen.getByText(/director:seam\/gemini-2\.5-flash/)).toBeInTheDocument(),
    )
  })
})
