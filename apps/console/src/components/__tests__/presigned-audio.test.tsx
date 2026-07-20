import { render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PresignedAudio } from "../presigned-audio"

vi.mock("../../lib/api", () => ({
  presignArtifact: vi.fn(async (_t: string, id: string) => ({ url: `https://s3.test/${id}` })),
}))
vi.mock("../../lib/use-auth", () => ({ useAuth: () => ({ token: "t" }) }))

describe("PresignedAudio", () => {
  it("resolves a presigned url and renders an audio element", async () => {
    render(<PresignedAudio artifactId="art-1" />)
    // waitFor only retries on a thrown error, not a falsy return, so the
    // assertion must live inside the callback (querySelector returning null
    // does not by itself trigger a retry).
    await waitFor(() => {
      expect(document.querySelector("audio[src='https://s3.test/art-1']")).not.toBeNull()
    })
  })
  it("renders nothing for an empty id", () => {
    const { container } = render(<PresignedAudio artifactId="" />)
    expect(container.querySelector("audio")).toBeNull()
  })
})
