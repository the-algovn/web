import { afterEach, expect, it, vi } from "vitest"
import {
  ApiError,
  type GetPlayerStateResponse,
  getPlayerState,
  isExpiredChallenge,
  isOutcomeUnknown,
  isRateLimited,
  isReplay,
  playerStateFromSnapshot,
  request,
  type SubmitClicksResponse,
  submitClicks,
} from "../api"

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body)
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload, { status, headers: { "Content-Type": "application/json", ...headers } })
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it("binds the client to env.apiBase, which carries the product prefix", async () => {
  const fetchMock = mockFetch(200, { total: "7" })
  await request<{ total?: string }>("GET", "/counter")
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.algovn.com/the-button/counter",
    expect.anything()
  )
})

it("maps 429 with Retry-After to a rate-limited ApiError", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" }, { "Retry-After": "5" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isRateLimited(err)).toBe(true)
  expect((err as ApiError).retryAfterSeconds).toBe(5)
  expect((err as ApiError).code).toBe("ResourceExhausted")
})

it("maps 409 to a replay error, distinct from rate limiting", async () => {
  mockFetch(409, { code: "AlreadyExists", message: "challenge replayed" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isReplay(err)).toBe(true)
  expect(isRateLimited(err)).toBe(false)
  expect(isExpiredChallenge(err)).toBe(false)
})

it("maps 400 FailedPrecondition to an expired-challenge error", async () => {
  mockFetch(400, { code: "FailedPrecondition", message: "challenge_expired" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isExpiredChallenge(err)).toBe(true)
})

it("does not treat other 400s as expired challenges", async () => {
  mockFetch(400, { code: "InvalidArgument", message: "bad work" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isExpiredChallenge(err)).toBe(false)
  expect((err as ApiError).status).toBe(400)
})

it("maps 502 Unavailable to an outcome-unknown error, not a retryable one", async () => {
  mockFetch(502, { code: "Unavailable", message: "redis unavailable" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isOutcomeUnknown(err)).toBe(true)
  expect(isRateLimited(err)).toBe(false)
  expect(isReplay(err)).toBe(false)
  expect(isExpiredChallenge(err)).toBe(false)
  expect((err as ApiError).retryAfterSeconds).toBeUndefined()
})

it("submitClicks reads only nextChallenge from a pure-ack response", async () => {
  mockFetch(200, { nextChallenge: { challenge: "c2", workFactor: "1" } })
  const res: SubmitClicksResponse = await submitClicks(
    { challenge: "c1", nonce: "n1", clickCount: 3 },
    "tok"
  )
  expect(res).toEqual({ nextChallenge: { challenge: "c2", workFactor: "1" } })
  expect(Object.keys(res)).toEqual(["nextChallenge"])
})

it("getPlayerState hits GET /player-state with a Bearer token and parses the snapshot", async () => {
  const snapshot: GetPlayerStateResponse = {
    totalClicks: "42",
    allTimeRank: 3,
    weeklyRank: 1,
    achievements: [{ id: "ten", title: "Ten", unlockedAt: "2026-07-18T00:00:00Z" }],
    milestones: [{ threshold: "100", title: "Century" }],
    quests: [
      {
        id: "warmup",
        title: "Warm Up",
        description: "Click 100 times",
        kind: "QUEST_KIND_DAILY",
        target: "100",
        progress: "10",
        done: false,
        reward: "+50 XP",
      },
    ],
    streak: { currentDays: 3, bestDays: 5, lastContribDate: "2026-07-19" },
  }
  const fetchMock = mockFetch(200, snapshot)
  const res = await getPlayerState("tok")
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.algovn.com/the-button/player-state",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) })
  )
  expect(res).toEqual(snapshot)
})

it("playerStateFromSnapshot normalizes protojson decimal strings/enums into numbers and daily|weekly", () => {
  const snapshot: GetPlayerStateResponse = {
    totalClicks: "42",
    allTimeRank: 3,
    weeklyRank: 1,
    achievements: [{ id: "ten", title: "Ten", unlockedAt: "2026-07-18T00:00:00Z" }],
    milestones: [{ threshold: "100", title: "Century" }],
    quests: [
      {
        id: "warmup",
        title: "Warm Up",
        description: "Click 100 times",
        kind: "QUEST_KIND_DAILY",
        target: "100",
        progress: "10",
        done: false,
        reward: "+50 XP",
      },
      {
        id: "weekly-grind",
        title: "Weekly Grind",
        description: "Click 1000 times",
        kind: "QUEST_KIND_WEEKLY",
        target: "1000",
        progress: "1000",
        done: true,
        reward: "+500 XP",
      },
    ],
    streak: { currentDays: 3, bestDays: 5, lastContribDate: "2026-07-19" },
  }

  const ps = playerStateFromSnapshot(snapshot)

  expect(ps.total).toBe(42)
  expect(ps.allTimeRank).toBe(3)
  expect(ps.weeklyRank).toBe(1)
  expect(ps.achievements).toEqual(snapshot.achievements)
  expect(ps.milestones).toEqual(snapshot.milestones)
  expect(ps.streak).toEqual({ current: 3, best: 5, lastDay: "2026-07-19" })
  expect(ps.quests).toEqual([
    {
      id: "warmup",
      title: "Warm Up",
      description: "Click 100 times",
      kind: "daily",
      target: 100,
      progress: 10,
      done: false,
      reward: "+50 XP",
    },
    {
      id: "weekly-grind",
      title: "Weekly Grind",
      description: "Click 1000 times",
      kind: "weekly",
      target: 1000,
      progress: 1000,
      done: true,
      reward: "+500 XP",
    },
  ])
})

it("playerStateFromSnapshot defaults missing fields to empty/zero", () => {
  const ps = playerStateFromSnapshot({})
  expect(ps).toEqual({
    total: 0,
    allTimeRank: 0,
    weeklyRank: 0,
    achievements: [],
    milestones: [],
    quests: [],
    streak: { current: 0, best: 0, lastDay: "" },
  })
})
