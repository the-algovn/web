import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

// The seed lands via a promise `.then()` (listAchievements resolving), not
// inside an act()-wrapped event like the counter tests above. Under fake
// timers that setState commit is scheduled on a task queue advanceTimers does
// not pump, so the DOM never updates no matter how much virtual time passes.
// These three tests are purely promise-driven — nothing here needs timer
// control — so they run on real timers and poll with findByText, which
// observes the real scheduler.
it("seeds your clicks from the achievements snapshot before any submit lands", async () => {
  vi.useRealTimers()
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  vi.spyOn(api, "listAchievements").mockResolvedValue({
    catalog: [],
    milestones: [],
    userTotalClicks: "500",
  })

  render(<App />)
  expect(await screen.findByText("500")).toBeInTheDocument()
})

it("shows zero, not an em dash, for a signed-in user who has never clicked", async () => {
  // protojson omits zero-valued fields: a user with no clicks sends no
  // userTotalClicks at all, which looks identical to an anonymous response.
  vi.useRealTimers()
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  vi.spyOn(api, "listAchievements").mockResolvedValue({ catalog: [], milestones: [] })

  render(<App />)
  expect(await screen.findByText("0")).toBeInTheDocument()
})

it("does not re-seed a stale total when the token is renewed", async () => {
  vi.useRealTimers()
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  const list = vi
    .spyOn(api, "listAchievements")
    .mockResolvedValue({ catalog: [], milestones: [], userTotalClicks: "500" })

  const { rerender } = render(<App />)
  expect(await screen.findByText("500")).toBeInTheDocument()

  // A silent renewal hands over a new token, which re-runs the effect. The
  // snapshot it fetches is stale relative to clicks that have already landed,
  // so it must not win. Changing the token is what makes this test bite:
  // rerender() alone would not re-run a [token] effect.
  list.mockResolvedValue({ catalog: [], milestones: [], userTotalClicks: "400" })
  authState.token = "tok-renewed"
  rerender(<App />)
  // Wait for the renewed token's listAchievements to actually resolve, so the
  // assertion proves the seed was ignored — not merely that it hasn't run yet.
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  expect(screen.getByText("500")).toBeInTheDocument() // seeded once, never re-seeded
})
