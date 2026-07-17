import { afterEach, expect, it, vi } from "vitest"
import { ApiError, createApiClient } from "../index"

const { request } = createApiClient({ baseUrl: "https://api.example.test/x" })

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

it("prefixes the configured baseUrl and sends a bearer token with no body on GET", async () => {
  const fetchMock = mockFetch(200, { total: "7" })
  const res = await request<{ total?: string }>("GET", "/counter", undefined, "tok123")
  expect(res.total).toBe("7")
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.example.test/x/counter",
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

it("parses Retry-After on 429 and preserves the error code", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" }, { "Retry-After": "5" })
  const err = (await request("POST", "/clicks", {}).catch((e: unknown) => e)) as ApiError
  expect(err).toBeInstanceOf(ApiError)
  expect(err.status).toBe(429)
  expect(err.code).toBe("ResourceExhausted")
  expect(err.retryAfterSeconds).toBe(5)
  expect(err.message).toBe("slow down")
})

it("defaults Retry-After to 2s when the header is unreadable (CORS)", async () => {
  mockFetch(429, { code: "ResourceExhausted", message: "slow down" })
  const err = (await request("POST", "/clicks", {}).catch((e: unknown) => e)) as ApiError
  expect(err.retryAfterSeconds).toBe(2)
})

it("does not attach retryAfterSeconds to non-429 errors", async () => {
  mockFetch(409, { code: "AlreadyExists", message: "challenge replayed" })
  const err = (await request("POST", "/clicks", {}).catch((e: unknown) => e)) as ApiError
  expect(err.status).toBe(409)
  expect(err.code).toBe("AlreadyExists")
  expect(err.retryAfterSeconds).toBeUndefined()
})

it("surfaces the gateway code and message from a JSON error envelope", async () => {
  mockFetch(400, { code: "FailedPrecondition", message: "challenge_expired" })
  const err = (await request("POST", "/clicks", {}).catch((e: unknown) => e)) as ApiError
  expect(err.status).toBe(400)
  expect(err.code).toBe("FailedPrecondition")
  expect(err.message).toBe("challenge_expired")
  expect(err.name).toBe("ApiError")
})

it("survives non-JSON error bodies (edge/proxy HTML)", async () => {
  mockFetch(502, "<html>bad gateway</html>")
  const err = (await request("GET", "/counter").catch((e: unknown) => e)) as ApiError
  expect(err).toBeInstanceOf(ApiError)
  expect(err.status).toBe(502)
  expect(err.code).toBe("unknown")
  expect(err.message).toBe("HTTP 502")
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
