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

it("GETs the resource path with a bearer token and no body", async () => {
  const fetchMock = mockFetch(200, { total: "7" })
  const res = await request<{ total?: string }>("GET", "/counter", undefined, "tok123")
  expect(res.total).toBe("7")
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.algovn.com/the-button/counter",
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
    })
  )
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  expect(init.body).toBeUndefined()
})

it("POSTs a JSON body with Content-Type on write methods", async () => {
  const fetchMock = mockFetch(200, {})
  await request("POST", "/clicks", { challenge: "c", nonce: "n", clickCount: 3 }, "tok")
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  expect(init.method).toBe("POST")
  expect(init.body).toBe(JSON.stringify({ challenge: "c", nonce: "n", clickCount: 3 }))
  expect(init.headers).toMatchObject({ "Content-Type": "application/json" })
})

it("omits the Authorization header without a token", async () => {
  const fetchMock = mockFetch(200, {})
  await request("GET", "/counter")
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  expect(init.headers).not.toHaveProperty("Authorization")
})

it("maps 429 with Retry-After to a rate-limited ApiError", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" }, { "Retry-After": "5" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect(isRateLimited(err)).toBe(true)
  expect((err as ApiError).retryAfterSeconds).toBe(5)
  expect((err as ApiError).code).toBe("ResourceExhausted")
})

it("defaults Retry-After to 2s when the header is unreadable (CORS)", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" })
  const err = await request("POST", "/clicks", {}).catch((e: unknown) => e)
  expect((err as ApiError).retryAfterSeconds).toBe(2)
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

it("survives non-JSON error bodies (edge/proxy HTML)", async () => {
  mockFetch(502, "<html>bad gateway</html>")
  const err = await request("GET", "/counter").catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(502)
  expect((err as ApiError).code).toBe("unknown")
  expect((err as ApiError).message).toBe("HTTP 502")
  expect(isOutcomeUnknown(err)).toBe(true)
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

it("preserves uint64 fields as decimal strings without numeric coercion (protojson wire shape)", async () => {
  mockFetch(200, { total: "18446744073709551615" })
  const res = await request<{ total?: string }>("GET", "/counter")
  expect(res.total).toBe("18446744073709551615")
  expect(typeof res.total).toBe("string")
})

it("treats a response with all zero-valued fields omitted (protojson) as an empty object", async () => {
  mockFetch(200, {})
  const res = await request<{ total?: string }>("GET", "/counter")
  expect(res.total).toBeUndefined()
})
