import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { labCall } from "../../lib/api"
import { LLMCallDrawer } from "../llm-call-drawer"

vi.mock("../../lib/api", () => ({
  labCall: vi.fn(),
  radioCall: vi.fn(),
  videoClawCall: vi.fn(),
  presignArtifact: vi.fn(),
  ApiError: class extends Error {},
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mocked = vi.mocked(labCall)

beforeEach(() => {
  mocked.mockReset()
})

describe("LLMCallDrawer", () => {
  it("fetches only the calls for one correlation id", async () => {
    mocked.mockResolvedValue({
      calls: [{ id: "7", label: "script:seam", model: "claude-haiku-4-5-20251001", systemPrompt: "sys", userPrompt: "usr", output: "out", costUsd: 0.002, latencyMs: 810 }],
      total: "1",
    })
    render(<LLMCallDrawer token="tok" correlationId="corr-1" />)
    await waitFor(() => expect(screen.getByText("script:seam")).toBeInTheDocument())
    expect(mocked).toHaveBeenCalledWith("tok", "/llm-calls/list", { correlationId: "corr-1", limit: 20, offset: 0 })
    expect(screen.getByText("out")).toBeInTheDocument()
  })

  it("says so when the join missed rather than rendering nothing", async () => {
    mocked.mockResolvedValue({ calls: [], total: "0" })
    render(<LLMCallDrawer token="tok" correlationId="corr-2" />)
    await waitFor(() => expect(screen.getByText(/No model calls/)).toBeInTheDocument())
  })

  it("renders nothing at all without a correlation id", () => {
    const { container } = render(<LLMCallDrawer token="tok" correlationId="" />)
    expect(container).toBeEmptyDOMElement()
    expect(mocked).not.toHaveBeenCalled()
  })
})
