// Typed wrappers over the shared request kernel. env.apiBase already includes
// the product prefix (…/the-button), so paths append directly, e.g.
// GET <apiBase>/counter, POST <apiBase>/clicks.
// Responses are protojson: camelCase fields, uint64 as decimal strings,
// google.protobuf.Timestamp as RFC3339 strings, zero-valued fields omitted.
import { ApiError, createApiClient } from "@algovn/api"
import { env } from "./env"

export { ApiError }

export const { request } = createApiClient({ baseUrl: env.apiBase })

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
  totalUsers?: string
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

export const getCounter = () => request<GetCounterResponse>("GET", "/counter")

export const listAchievements = (token?: string) =>
  request<ListAchievementsResponse>("GET", "/achievements", undefined, token)

export const issueChallenge = (intendedClicks: number, token: string) =>
  request<IssueChallengeResponse>("POST", "/challenge", { intendedClicks }, token)

export const submitClicks = (req: SubmitClicksRequest, token: string) =>
  request<SubmitClicksResponse>("POST", "/clicks", req, token)
