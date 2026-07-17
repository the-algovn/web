import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import App from "../App"
import * as api from "../lib/api"

// Force the signed-in branch so ClickButton renders. The stock app.test.tsx
// covers the signed-out call to action; mocking auth there would break it,
// which is why this lives in its own file.
//
// vi.hoisted is required: vi.mock is hoisted above the imports, so the factory
// cannot close over an ordinary module-level `let`. Keeping the token mutable
// lets a later test simulate a silent renewal.
const authState = vi.hoisted(() => ({ token: "tok" as string | null }))

vi.mock("../lib/use-auth", () => ({
  useAuth: () => ({ user: { profile: { sub: "u1" } }, token: authState.token }),
}))

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

// Fake timers (same convention as counter.test.tsx) make the 600ms rAF tween
// deterministic instead of racing wall-clock time.
beforeEach(() => {
  vi.useFakeTimers()
  authState.token = "tok"
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const counterText = () => screen.getByTestId("counter").textContent?.replace(/\s/g, "") ?? ""

it("credits a click to the global counter before any submit lands", async () => {
  // The challenge never resolves, so the click stays pending for the whole
  // test: nothing but the optimistic path can move the counter here.
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  vi.spyOn(api, "listAchievements").mockResolvedValue({ catalog: [], milestones: [] })

  render(<App />)
  const es = FakeEventSource.instances[0]!
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({ type: "counter", total: 1_000 }),
    } as MessageEvent)
  })
  await vi.advanceTimersByTimeAsync(600)
  expect(counterText()).toContain("1,000")

  fireEvent.click(screen.getByRole("button", { name: /contribute/i }))
  await vi.advanceTimersByTimeAsync(600)
  expect(counterText()).toContain("1,001")
})

it("does not let a stale lower frame drag the counter backward", async () => {
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  vi.spyOn(api, "listAchievements").mockResolvedValue({ catalog: [], milestones: [] })

  render(<App />)
  const es = FakeEventSource.instances[0]!
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({ type: "counter", total: 1_000 }),
    } as MessageEvent)
  })
  await vi.advanceTimersByTimeAsync(600)
  expect(counterText()).toContain("1,000")

  // A stale frame reports a lower total — a late SSE delivery, or a sample
  // from the polling fallback. The counter must not tick backward.
  act(() => {
    es.onmessage?.({
      data: JSON.stringify({ type: "counter", total: 990 }),
    } as MessageEvent)
  })
  await vi.advanceTimersByTimeAsync(600)
  expect(counterText()).toContain("1,000")
})
