import { afterEach, expect, it, vi } from "vitest"
import {
  ApiError,
  isExpiredChallenge,
  isOutcomeUnknown,
  isRateLimited,
  isReplay,
  postRpc,
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

it("POSTs JSON to the ButtonService method URL with a bearer token", async () => {
  const fetchMock = mockFetch(200, { total: "7" })
  const res = await postRpc<{ total?: string }>("GetCounter", {}, "tok123")
  expect(res.total).toBe("7")
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.algovn.com/the-button/algovn.button.v1.ButtonService/GetCounter",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        Authorization: "Bearer tok123",
      }),
    })
  )
})

it("omits the Authorization header without a token", async () => {
  const fetchMock = mockFetch(200, {})
  await postRpc("GetCounter", {})
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  expect(init.headers).not.toHaveProperty("Authorization")
})

it("maps 429 with Retry-After to a rate-limited ApiError", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" }, { "Retry-After": "5" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect(isRateLimited(err)).toBe(true)
  expect((err as ApiError).retryAfterSeconds).toBe(5)
  expect((err as ApiError).code).toBe("ResourceExhausted")
})

it("defaults Retry-After to 2s when the header is unreadable (CORS)", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect((err as ApiError).retryAfterSeconds).toBe(2)
})

it("maps 409 to a replay error, distinct from rate limiting", async () => {
  mockFetch(409, { code: "AlreadyExists", message: "challenge replayed" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect(isReplay(err)).toBe(true)
  expect(isRateLimited(err)).toBe(false)
  expect(isExpiredChallenge(err)).toBe(false)
})

it("maps 400 FailedPrecondition to an expired-challenge error", async () => {
  mockFetch(400, { code: "FailedPrecondition", message: "challenge_expired" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect(isExpiredChallenge(err)).toBe(true)
})

it("does not treat other 400s as expired challenges", async () => {
  mockFetch(400, { code: "InvalidArgument", message: "bad work" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect(isExpiredChallenge(err)).toBe(false)
  expect((err as ApiError).status).toBe(400)
})

it("survives non-JSON error bodies (edge/proxy HTML)", async () => {
  mockFetch(502, "<html>bad gateway</html>")
  const err = await postRpc("GetCounter", {}).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(502)
  expect((err as ApiError).code).toBe("unknown")
  expect((err as ApiError).message).toBe("HTTP 502")
  // Any 502, JSON or not, means the outcome is unknown — never retryable.
  expect(isOutcomeUnknown(err)).toBe(true)
})

it("maps 502 Unavailable to an outcome-unknown error, not a retryable one", async () => {
  // Postgres/Redis may have durably committed the batch already; the caller
  // (T15's batcher) must discard, never re-submit under a fresh challenge.
  mockFetch(502, { code: "Unavailable", message: "redis unavailable" })
  const err = await postRpc("SubmitClicks", {}).catch((e: unknown) => e)
  expect(isOutcomeUnknown(err)).toBe(true)
  expect(isRateLimited(err)).toBe(false)
  expect(isReplay(err)).toBe(false)
  expect(isExpiredChallenge(err)).toBe(false)
  expect((err as ApiError).retryAfterSeconds).toBeUndefined()
})

it("preserves uint64 fields as decimal strings without numeric coercion (protojson wire shape)", async () => {
  // This value exceeds Number.MAX_SAFE_INTEGER; protojson renders uint64 as a
  // JSON string precisely so precision survives the wire hop.
  mockFetch(200, { total: "18446744073709551615" })
  const res = await postRpc<{ total?: string }>("GetCounter", {})
  expect(res.total).toBe("18446744073709551615")
  expect(typeof res.total).toBe("string")
})

it("treats a response with all zero-valued fields omitted (protojson) as an empty object", async () => {
  // protojson omits zero/default-valued fields entirely — a brand new counter
  // is `{}`, not `{ total: "0" }`. Callers must coerce with `total ?? "0"`.
  mockFetch(200, {})
  const res = await postRpc<{ total?: string }>("GetCounter", {})
  expect(res.total).toBeUndefined()
})
