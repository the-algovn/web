import { afterEach, expect, it, vi } from "vitest"
import {
  ApiError,
  isExpiredChallenge,
  isOutcomeUnknown,
  isRateLimited,
  isReplay,
  request,
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
