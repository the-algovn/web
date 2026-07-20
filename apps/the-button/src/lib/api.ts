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
  nextChallenge?: IssueChallengeResponse
}

export type QuestKind =
  | "QUEST_KIND_DAILY"
  | "QUEST_KIND_WEEKLY"
  | "QUEST_KIND_UNSPECIFIED"

export interface Quest {
  id: string
  title: string
  description: string
  kind?: QuestKind
  target?: string
  progress?: string
  done?: boolean
  reward?: string
  resetsAt?: string
}

export interface Streak {
  currentDays?: number
  bestDays?: number
  lastContribDate?: string
}

export interface GetPlayerStateResponse {
  totalClicks?: string // decimal string
  allTimeRank?: number
  weeklyRank?: number
  achievements?: Achievement[] // full catalog, unlockedAt on earned
  milestones?: Milestone[]
  quests?: Quest[]
  streak?: Streak
}

export interface QuestProgress {
  id: string
  title: string
  description: string
  kind: "daily" | "weekly"
  target: number
  progress: number
  done: boolean
  reward: string
}

export interface PlayerState {
  total: number
  allTimeRank: number // 0 = unranked
  weeklyRank: number
  achievements: Achievement[]
  milestones: Milestone[]
  quests: QuestProgress[]
  streak: { current: number; best: number; lastDay: string }
}

export function playerStateFromSnapshot(
  s: GetPlayerStateResponse,
): PlayerState {
  return {
    total: Number(s.totalClicks ?? 0),
    allTimeRank: s.allTimeRank ?? 0,
    weeklyRank: s.weeklyRank ?? 0,
    achievements: s.achievements ?? [],
    milestones: s.milestones ?? [],
    quests: (s.quests ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      kind: q.kind === "QUEST_KIND_WEEKLY" ? "weekly" : "daily",
      target: Number(q.target ?? 0),
      progress: Number(q.progress ?? 0),
      done: q.done ?? false,
      reward: q.reward ?? "",
    })),
    streak: {
      current: s.streak?.currentDays ?? 0,
      best: s.streak?.bestDays ?? 0,
      lastDay: s.streak?.lastContribDate ?? "",
    },
  }
}

export interface LeaderboardEntry {
  rank: number
  displayName?: string
  clicks?: string
}

export interface GetLeaderboardResponse {
  allTime?: LeaderboardEntry[]
  thisWeek?: LeaderboardEntry[]
  myAllTimeRank?: number
  myWeeklyRank?: number
}

// Error discrimination per the acp mapping (launch-blocker additions, spec §6):
// ResourceExhausted→429 (+Retry-After), AlreadyExists→409, FailedPrecondition→400,
// Unavailable→502.
export const isRateLimited = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 429
export const isReplay = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 409
export const isExpiredChallenge = (err: unknown): err is ApiError =>
  err instanceof ApiError &&
  err.status === 400 &&
  err.code === "FailedPrecondition"
// The gateway maps codes.Unavailable (Redis/Postgres unreachable) to 502. In
// that case Postgres may have durably committed the batch already — the
// outcome is UNKNOWN. The batcher (T15) MUST discard, never retry or re-queue
// under a fresh challenge, or it risks double-crediting clicks.
export const isOutcomeUnknown = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 502

export const getCounter = () => request<GetCounterResponse>("GET", "/counter")

export const getPlayerState = (token: string) =>
  request<GetPlayerStateResponse>("GET", "/player-state", undefined, token)

export const issueChallenge = (intendedClicks: number, token: string) =>
  request<IssueChallengeResponse>(
    "POST",
    "/challenge",
    { intendedClicks },
    token,
  )

export const submitClicks = (req: SubmitClicksRequest, token: string) =>
  request<SubmitClicksResponse>("POST", "/clicks", req, token)

export const getLeaderboard = (token?: string) =>
  request<GetLeaderboardResponse>("GET", "/leaderboard", undefined, token)
