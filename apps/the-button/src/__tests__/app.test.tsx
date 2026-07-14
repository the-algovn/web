import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import App from "../App"
import * as api from "../lib/api"

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

it("does not replace a higher milestone from the RPC snapshot with a lower SSE frame", async () => {
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  vi.spyOn(api, "listAchievements").mockResolvedValueOnce({
    catalog: [],
    milestones: [{ threshold: "5000", title: "Five Thousand Strong" }],
  })
  render(<App />)
  const es = FakeEventSource.instances[0]!
  // Fire a lower milestone via SSE first
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({
        type: "milestone",
        threshold: 1000,
        title: "A Thousand Tiny Rebellions",
      }),
    } as MessageEvent)
  })
  // Wait for the higher milestone from the RPC snapshot to load
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("5,000 clicks — Five Thousand Strong")
  })
})

it("replaces a lower milestone from SSE with a higher one from the RPC snapshot", async () => {
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  vi.spyOn(api, "listAchievements").mockResolvedValueOnce({
    catalog: [],
    milestones: [{ threshold: "5000", title: "Five Thousand Strong" }],
  })
  render(<App />)
  const es = FakeEventSource.instances[0]!
  // Fire a lower milestone via SSE first
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
  // Wait for the higher milestone from the RPC snapshot to replace it
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("5,000 clicks — Five Thousand Strong")
  })
})
