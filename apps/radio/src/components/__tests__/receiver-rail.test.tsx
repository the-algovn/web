import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ReceiverRail } from "../receiver-rail"

const base = {
  status: "music-only" as const,
  listeners: 3,
  playerState: "playing" as const,
  onPlay: () => {},
  onPause: () => {},
  onVolume: () => {},
}

describe("ReceiverRail request button", () => {
  it("signed out: shows the sign-in label and calls onSignIn", async () => {
    const onSignIn = vi.fn()
    const onRequest = vi.fn()
    render(
      <ReceiverRail {...base} signedIn={false} onSignIn={onSignIn} onRequest={onRequest} />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Đăng nhập để yêu cầu" }),
    )
    expect(onSignIn).toHaveBeenCalled()
    expect(onRequest).not.toHaveBeenCalled()
  })

  it("signed in: shows the request label and calls onRequest", async () => {
    const onRequest = vi.fn()
    render(
      <ReceiverRail {...base} signedIn={true} onSignIn={() => {}} onRequest={onRequest} />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Yêu cầu bài hát" }),
    )
    expect(onRequest).toHaveBeenCalled()
  })
})
