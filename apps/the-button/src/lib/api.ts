// Thin client for the control-plane JSON convention:
// POST <VITE_API_BASE>/algovn.button.v1.ButtonService/<Method>.
// Responses are protojson: camelCase fields, uint64 as decimal strings,
// google.protobuf.Timestamp as RFC3339 strings, zero-valued fields omitted.
import { env } from "./env"

export interface Achievement {
  id?: string
  title?: string
  description?: string
  unlockedAt?: string
}

export interface Milestone {
  threshold?: string
  title?: string
  reachedAt?: string
}

export interface GetCounterResponse {
  total?: string
}

export interface IssueChallengeResponse {
  challenge?: string
  workFactor?: string
  minIntervalSeconds?: number
  maxBatch?: number
  expiresAt?: string
}

export interface SubmitClicksRequest {
  challenge: string
  nonce: string
  clickCount: number
}

export interface SubmitClicksResponse {
  userTotalClicks?: string
  unlocked?: Achievement[]
  nextChallenge?: IssueChallengeResponse
}

export interface ListAchievementsResponse {
  catalog?: Achievement[]
  milestones?: Milestone[]
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Error discrimination per the acp mapping (launch-blocker additions, spec §6):
// ResourceExhausted→429 (+Retry-After), AlreadyExists→409, FailedPrecondition→400,
// Unavailable→502.
export const isRateLimited = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 429
export const isReplay = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 409
export const isExpiredChallenge = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 400 && err.code === "FailedPrecondition"
// The gateway maps codes.Unavailable (Redis/Postgres unreachable) to 502. In
// that case Postgres may have durably committed the batch already — the
// outcome is UNKNOWN. The batcher (T15) MUST discard, never retry or re-queue
// under a fresh challenge, or it risks double-crediting clicks.
export const isOutcomeUnknown = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 502

export async function postRpc<T>(method: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${env.apiBase}/algovn.button.v1.ButtonService/${method}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
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

export const getCounter = () => postRpc<GetCounterResponse>("GetCounter", {})

export const listAchievements = (token?: string) =>
  postRpc<ListAchievementsResponse>("ListAchievements", {}, token)

export const issueChallenge = (intendedClicks: number, token: string) =>
  postRpc<IssueChallengeResponse>("IssueChallenge", { intendedClicks }, token)

export const submitClicks = (req: SubmitClicksRequest, token: string) =>
  postRpc<SubmitClicksResponse>("SubmitClicks", req, token)
