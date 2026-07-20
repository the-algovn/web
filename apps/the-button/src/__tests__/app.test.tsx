import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import App from "../App"
import * as api from "../lib/api"
import type { UserFrame } from "../lib/playerStream"

// The milestone-precedence tests below need a token so the per-user
// GetPlayerState seed effect runs; every other test in this file stays
// signed-out (real useAuth resolves to no token in this env anyway — mocking
// just makes the opt-in explicit and per-test).
const authState = vi.hoisted(() => ({ token: null as string | null }))
vi.mock("../lib/use-auth", () => ({
  useAuth: () => ({ user: null, token: authState.token }),
}))

// Captures the PlayerStream App wires up for the authenticated per-user SSE
// channel so a test can push a fake UserFrame at it, the same way
// FakeEventSource below does for the counter channel.
const playerStreamState = vi.hoisted(() => ({
  instances: [] as { onFrame: (f: UserFrame) => void }[],
}))
vi.mock("../lib/playerStream", () => ({
  // A regular function, not an arrow: `new PlayerStream(...)` in App.tsx
  // requires the mock implementation to be constructible.
  PlayerStream: vi
    .fn()
    // biome-ignore lint/complexity/useArrowFunction: vitest 4 only makes `new PlayerStream(...)` constructible when the implementation is a `function` or class
    .mockImplementation(function (opts: { onFrame: (f: UserFrame) => void }) {
      playerStreamState.instances.push(opts)
      return { start: vi.fn(), stop: vi.fn() }
    }),
}))

beforeEach(() => {
  localStorage.setItem("tb:intro:v1", "done")
  authState.token = null
  playerStreamState.instances = []
})

it("renders the page heading and the sign-in call to action", async () => {
  render(<App />)
  expect(
    screen.getByRole("heading", { name: "THE BUTTON." }),
  ).toBeInTheDocument()
  expect(
    await screen.findByRole("button", { name: /sign in to contribute/i }),
  ).toBeInTheDocument()
})

it("hides the HUD streak chip when signed out (zero streak)", async () => {
  const { container } = render(<App />)
  await screen.findByRole("button", { name: /sign in to contribute/i })
  // Scoped to the HUD chips row: GoalsPanel has its own always-visible
  // streak readout elsewhere on the page, this only asserts on the HUD one.
  const chips = container.querySelector(".tb-chips")
  expect(chips?.textContent).not.toContain("🔥")
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
  vi.restoreAllMocks()
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
  expect(screen.getByRole("status")).toHaveTextContent(
    "1,000 clicks — A Thousand Tiny Rebellions",
  )
})

it("does not replace a higher milestone from the player-state snapshot with a lower SSE frame", async () => {
  authState.token = "tok"
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  vi.spyOn(api, "getPlayerState").mockResolvedValueOnce({
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
  // Wait for the higher milestone from the player-state snapshot to load
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(
      "5,000 clicks — Five Thousand Strong",
    )
  })
})

it("replaces a lower milestone from SSE with a higher one from the player-state snapshot", async () => {
  authState.token = "tok"
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  vi.spyOn(api, "getPlayerState").mockResolvedValueOnce({
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
  expect(screen.getByRole("status")).toHaveTextContent(
    "1,000 clicks — A Thousand Tiny Rebellions",
  )
  // Wait for the higher milestone from the player-state snapshot to replace it
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(
      "5,000 clicks — Five Thousand Strong",
    )
  })
})

it("renders the contributor count from an SSE counter frame", async () => {
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  render(<App />)
  const es = FakeEventSource.instances[0]!
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({
        type: "counter",
        total: 1_204_882,
        users: 84_201,
      }),
    } as MessageEvent)
  })
  expect(await screen.findByText("84,201")).toBeInTheDocument()
})

it("shows the intro slideshow on a first visit and sets the flag on skip", async () => {
  localStorage.removeItem("tb:intro:v1")
  render(<App />)
  expect(screen.getByRole("dialog", { name: "intro" })).toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: "skip ›" }))
  expect(
    screen.queryByRole("dialog", { name: "intro" }),
  ).not.toBeInTheDocument()
  expect(localStorage.getItem("tb:intro:v1")).toBe("done")
})

it("does not show the intro on a revisit", () => {
  render(<App />)
  expect(
    screen.queryByRole("dialog", { name: "intro" }),
  ).not.toBeInTheDocument()
})

it("reopens the intro from the footer replay link", async () => {
  render(<App />)
  await userEvent.click(screen.getByRole("button", { name: "replay intro" }))
  expect(screen.getByRole("dialog", { name: "intro" })).toBeInTheDocument()
})
