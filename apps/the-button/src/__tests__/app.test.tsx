import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import App from "../App"

it("renders the page heading and the sign-in call to action", async () => {
  render(<App />)
  expect(screen.getByRole("heading", { name: "the button" })).toBeInTheDocument()
  expect(
    await screen.findByRole("button", { name: /sign in to contribute/i })
  ).toBeInTheDocument()
})

// Captures the EventSource App wires up internally via LiveCounter so a test
// can push a raw SSE frame at it, the same way the real anonymous
// the-button.counter channel would (spec §10).
class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  constructor() {
    FakeEventSource.instances.push(this)
  }
  close() {}
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it("renders the milestone banner when one arrives via the SSE stream", async () => {
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  render(<App />)
  const es = FakeEventSource.instances[0]!
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({
        type: "milestone",
        threshold: 1000,
        title: "A Thousand Tiny Rebellions",
      }),
    } as MessageEvent)
  })
  expect(screen.getByRole("status")).toHaveTextContent("1,000 clicks — A Thousand Tiny Rebellions")
})
