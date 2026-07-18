import { render, screen, act } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import App from "../App"
import * as api from "../lib/api"

vi.mock("../lib/use-auth", () => ({
  useAuth: () => ({ user: { profile: { sub: "u1", name: "You" } }, token: "tok" }),
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  close() {}
}

beforeEach(() => {
  vi.useRealTimers()
  FakeEventSource.instances = []
  vi.stubGlobal("EventSource", FakeEventSource)
  vi.spyOn(api, "getLeaderboard").mockResolvedValue({ allTime: [], thisWeek: [] })
  vi.spyOn(api, "issueChallenge").mockReturnValue(new Promise(() => {}))
  vi.spyOn(api, "listAchievements").mockResolvedValue({ catalog: [], milestones: [] })
  vi.spyOn(api, "getCounter").mockResolvedValue({ total: "0", totalUsers: "0" })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it("renders a leaderboard row from a leaderboard SSE frame", async () => {
  render(<App />)
  const lb = FakeEventSource.instances.find((e) => e.url.includes("leaderboard"))!
  expect(lb).toBeTruthy()
  act(() => {
    lb.onmessage?.({
      data: JSON.stringify({
        type: "leaderboard",
        allTime: [{ rank: 1, name: "Minh", clicks: 1000 }],
        thisWeek: [],
      }),
    } as MessageEvent)
  })
  expect(await screen.findByText("Minh")).toBeInTheDocument()
})
