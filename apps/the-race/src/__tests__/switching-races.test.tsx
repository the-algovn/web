// Switching from one race to another mid-session.
//
// The decoded commentary and the clock origin belong to ONE race. Carrying
// either into the next package is the bug this pins: useRaceClock would read an
// origin many seconds in the past, compute an elapsed past totalMs on its very
// first frame, and end the broadcast before the gun — so the viewer got the
// winner's panel instantly, with the PREVIOUS race's caption on the rail.
//
// A rematch, a pasted share link and a replay of a DIFFERENT race are all the
// same event, which is why the reset is keyed on the race's identity rather than
// on a phase transition. This drives it through the share link, the one of the
// three that needs no account.

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "../App"
import type { RacePackage } from "../lib/types"

const pkg = (
  raceId: string,
  intro: string,
  opening: string,
  finish: string,
): RacePackage => ({
  raceId,
  roomId: "m1",
  duckNames: ["Đức", "Lan"],
  durationMs: 4000,
  ticks: [
    { tMs: 0, positions: [0, 0] },
    { tMs: 4000, positions: [1, 0.8] },
  ],
  events: [],
  finishOrder: [0, 1],
  // No audioUrl anywhere: nothing is fetched or decoded, every line is a silent
  // caption, and the intro takes the 2500ms-a-line fallback — so this race runs
  // 2500 + COUNTDOWN_MS + 4000 from first word to result.
  lines: [
    { atMs: 0, text: opening, intensity: 3, audioUrl: "" },
    { atMs: 3500, text: finish, intensity: 5, audioUrl: "" },
  ],
  introLines: [{ atMs: 0, text: intro, intensity: 3, audioUrl: "" }],
  drama: "chaos",
  fairness: { seedCommit: `c-${raceId}`, serverSeed: "s", clientNonce: "n", seed: "x" },
})

const h = vi.hoisted(() => ({ packages: new Map<string, unknown>() }))

vi.mock("../lib/auth", () => ({
  signIn: vi.fn(),
  completeSignIn: vi.fn(),
  userManager: {},
}))
vi.mock("../lib/use-auth", () => ({ useAuth: () => ({ user: null, token: null }) }))
vi.mock("../lib/race-client", () => ({
  createRaceClient: () => ({
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    createRace: vi.fn(),
    startRace: vi.fn(),
    listRoomRaces: async () => ({ races: [], tally: [] }),
    getRace: async (raceId: string) => ({
      status: "RACE_STATUS_READY",
      prepareStage: "",
      error: "",
      race: h.packages.get(raceId) ?? null,
    }),
  }),
}))

/**
 * The audio clock IS the race clock, so this test moves time by moving
 * currentTime — which is exactly what the browser does, only by hand.
 */
let ctx: FakeAudioContext
class FakeAudioContext {
  currentTime = 0
  destination = {}
  constructor() {
    ctx = this
  }
  createGain() {
    return { gain: { value: 1 }, connect: () => {} }
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }
  }
  decodeAudioData() {
    return Promise.reject(new Error("no decoder in jsdom"))
  }
  resume() {
    return Promise.resolve()
  }
}

const realAudioContext = window.AudioContext

beforeEach(() => {
  h.packages.set("r1", pkg("r1", "Giới thiệu một", "Xuất phát một", "Đức thắng một"))
  h.packages.set("r2", pkg("r2", "Giới thiệu hai", "Xuất phát hai", "Đức thắng hai"))
  window.AudioContext = FakeAudioContext as never
})

afterEach(() => {
  h.packages.clear()
  window.history.replaceState(null, "", "#")
  window.AudioContext = realAudioContext
})

/**
 * replaceState rather than assigning location.hash: assigning it makes jsdom
 * queue a hashchange of its own, which lands whenever it likes and re-enters the
 * same path a second time. The app reads the hash on mount and on the event, so
 * setting it silently and firing exactly one event is the honest paste.
 */
const openLink = (raceId: string) => {
  window.history.replaceState(null, "", `#/r/${raceId}`)
  window.dispatchEvent(new HashChangeEvent("hashchange"))
}

/** Tap to authorise audio: browsers will not start an AudioContext without one. */
const tapToWatch = async () => {
  await screen.findByRole("button", { name: /Xem đua/ })
  // Re-queried rather than reused: the await above can span a re-render, and the
  // button that comes back from it may already be detached.
  fireEvent.click(screen.getByRole("button", { name: /Xem đua/ }))
}

describe("switching races", () => {
  it("opens a pasted link at that race's own first beat", async () => {
    window.history.replaceState(null, "", "#/r/r1")
    render(<App />)

    await tapToWatch()
    expect(await screen.findByText(/Giới thiệu một/)).toBeInTheDocument()

    // Run the first race out. Twenty seconds is past its whole presentation.
    ctx.currentTime = 20
    expect(await screen.findByText("THẮNG CUỘC")).toBeInTheDocument()

    // Paste a link to a DIFFERENT race into the tab that is already open.
    openLink("r2")

    // The second race opens on its own intro...
    expect(await screen.findByText(/Giới thiệu hai/)).toBeInTheDocument()
    // ...rather than landing on the winner's panel the instant it arrives...
    expect(screen.queryByText("THẮNG CUỘC")).not.toBeInTheDocument()
    // ...wearing the previous race's commentary.
    expect(screen.queryByText(/Đức thắng một/)).not.toBeInTheDocument()
  })
})
