import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import App from "../App"
import * as api from "../lib/api"
import type { UserFrame } from "../lib/playerStream"

// Force the signed-in branch, same convention as app-optimistic.test.tsx.
const authState = vi.hoisted(() => ({ token: "tok" as string | null }))
vi.mock("../lib/use-auth", () => ({
  useAuth: () => ({ user: { profile: { sub: "u1" } }, token: authState.token }),
}))

// Captures the PlayerStream App wires up for the per-user SSE channel so a
// test can push a fake UserFrame at it (same pattern as app-optimistic.test.tsx).
const playerStreamState = vi.hoisted(() => ({
  instances: [] as { onFrame: (f: UserFrame) => void }[],
}))
vi.mock("../lib/playerStream", () => ({
  PlayerStream: vi.fn().mockImplementation(function (opts: { onFrame: (f: UserFrame) => void }) {
    playerStreamState.instances.push(opts)
    return { start: vi.fn(), stop: vi.fn() }
  }),
}))

// Captures the options App hands the real Batcher so a test can drive
// `pending` directly via onPendingChange, without running the actual
// challenge/solve/submit pipeline (a real Worker) through jsdom — jsdom's
// Worker stub never answers postMessage, so that pipeline never resolves.
const batcherState = vi.hoisted(() => ({
  instances: [] as { onPendingChange?: (n: number) => void }[],
}))
vi.mock("../lib/batcher", () => ({
  Batcher: vi.fn().mockImplementation(function (opts: { onPendingChange?: (n: number) => void }) {
    batcherState.instances.push(opts)
    return { click: vi.fn(), dispose: vi.fn(), pendingCount: 0 }
  }),
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

beforeEach(() => {
  authState.token = "tok"
  playerStreamState.instances = []
  batcherState.instances = []
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it("never lets the personal counter dip when a batch acks before the per-user SSE frame catches up", async () => {
  vi.spyOn(api, "getPlayerState").mockResolvedValue({ totalClicks: "1000" })

  render(<App />)
  await waitFor(() => expect(screen.getByTestId("your-clicks")).toHaveTextContent("1,000"))
  const { onPendingChange } = batcherState.instances[0]!

  // 50 clicks accumulate as pending on top of the seeded total.
  act(() => onPendingChange?.(50))
  expect(screen.getByTestId("your-clicks")).toHaveTextContent("1,050")

  // Pure-ack: the batch lands and pending drops to 0 immediately, but the
  // per-user SSE frame carrying the raised myTotal has not arrived yet. The
  // displayed count must hold at 1,050, not dip back to 1,000.
  act(() => onPendingChange?.(0))
  expect(screen.getByTestId("your-clicks")).toHaveTextContent("1,050")

  // The SSE frame finally lands with the authoritative total — display holds
  // steady at the floor rather than dropping in between.
  const { onFrame } = playerStreamState.instances[0]!
  act(() => {
    onFrame({
      total: 1050,
      allTimeRank: 0,
      weeklyRank: 0,
      unlocked: [],
      questProgress: [],
      questsDone: [],
      streak: { current: 0, best: 0, lastDay: "" },
    })
  })
  expect(screen.getByTestId("your-clicks")).toHaveTextContent("1,050")

  // Once the server total actually overtakes the floor, the display rises
  // with it (the floor is not a ceiling).
  act(() => {
    onFrame({
      total: 1100,
      allTimeRank: 0,
      weeklyRank: 0,
      unlocked: [],
      questProgress: [],
      questsDone: [],
      streak: { current: 0, best: 0, lastDay: "" },
    })
  })
  expect(screen.getByTestId("your-clicks")).toHaveTextContent("1,100")
})
