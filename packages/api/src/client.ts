// Thin client for the control-plane REST routes. baseUrl already includes the
// product prefix (e.g. …/the-button), so paths append directly.
// Responses are protojson: camelCase fields, uint64 as decimal strings,
// google.protobuf.Timestamp as RFC3339 strings, zero-valued fields omitted.
import { ApiError } from "./errors"

export interface ApiClientConfig {
  baseUrl: string
}

export interface ApiClient {
  request: <T>(verb: string, path: string, body?: unknown, token?: string) => Promise<T>
}

export function createApiClient({ baseUrl }: ApiClientConfig): ApiClient {
  async function request<T>(verb: string, path: string, body?: unknown, token?: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const init: RequestInit = { method: verb, headers }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
      init.body = JSON.stringify(body)
    }
    const res = await fetch(`${baseUrl}${path}`, init)
    if (res.ok) return (await res.json()) as T

    let code = "unknown"
    let message = `HTTP ${res.status}`
    try {
      const errBody = (await res.json()) as { code?: string; message?: string }
      if (errBody.code) code = errBody.code
      if (errBody.message) message = errBody.message
    } catch {
      // non-JSON error body (edge/proxy HTML) — keep defaults
    }
    let retryAfterSeconds: number | undefined
    if (res.status === 429) {
      // Retry-After is not CORS-safelisted, so the browser may hide it;
      // fall back to the server's fixed 2s.
      const parsed = Number(res.headers.get("Retry-After"))
      retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 2
    }
    throw new ApiError(res.status, code, message, retryAfterSeconds)
  }
  return { request }
}
