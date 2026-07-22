// Authenticated listener API: search-and-pick requests over the gateway's
// /radio prefix. REST responses are protojson envelopes — camelCase,
// zero-valued fields omitted, int32 durations arrive as JSON numbers.
import { type ApiClient, createApiClient } from "@algovn/api"
import { env } from "./env"

export interface Candidate {
  ytId: string
  title: string
  channel?: string
  durationS: number
  thumbnailUrl?: string
}

export type RequestStatus = "approved" | "ready" | "aired" | "failed"

export interface TrackRequest {
  id: string
  source: "listener" | "ai"
  requestedByName?: string
  ytId: string
  title: string
  channel?: string
  durationS: number
  thumbnailUrl?: string
  status: RequestStatus
  failReason?: string
  createdAt: string
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined

export function parseCandidate(raw: unknown): Candidate | null {
  if (typeof raw !== "object" || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.ytId !== "string" || typeof r.title !== "string") return null
  const c: Candidate = {
    ytId: r.ytId,
    title: r.title,
    durationS: typeof r.durationS === "number" ? r.durationS : 0,
  }
  if (str(r.channel)) c.channel = str(r.channel)
  if (str(r.thumbnailUrl)) c.thumbnailUrl = str(r.thumbnailUrl)
  return c
}

const STATUSES: RequestStatus[] = ["approved", "ready", "aired", "failed"]

export function parseTrackRequest(raw: unknown): TrackRequest | null {
  if (typeof raw !== "object" || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== "string" || typeof r.ytId !== "string") return null
  if (typeof r.title !== "string" || typeof r.createdAt !== "string") return null
  if (r.source !== "listener" && r.source !== "ai") return null
  if (!STATUSES.includes(r.status as RequestStatus)) return null
  const out: TrackRequest = {
    id: r.id,
    source: r.source,
    ytId: r.ytId,
    title: r.title,
    durationS: typeof r.durationS === "number" ? r.durationS : 0,
    status: r.status as RequestStatus,
    createdAt: r.createdAt,
  }
  if (str(r.requestedByName)) out.requestedByName = str(r.requestedByName)
  if (str(r.channel)) out.channel = str(r.channel)
  if (str(r.thumbnailUrl)) out.thumbnailUrl = str(r.thumbnailUrl)
  if (str(r.failReason)) out.failReason = str(r.failReason)
  return out
}

export interface RequestApi {
  search(token: string, query: string): Promise<Candidate[]>
  requestTrack(token: string, candidate: Candidate): Promise<TrackRequest>
  myRequests(token: string): Promise<TrackRequest[]>
}

export function createRequestApi(deps?: {
  request?: ApiClient["request"]
}): RequestApi {
  const request =
    deps?.request ?? createApiClient({ baseUrl: env.apiBase }).request

  return {
    search: (token, query) =>
      request<{ candidates?: unknown[] }>("POST", "/search", { query }, token).then(
        (r) => (r.candidates ?? []).flatMap((c) => parseCandidate(c) ?? []),
      ),
    requestTrack: (token, candidate) => {
      const body: Record<string, unknown> = {
        ytId: candidate.ytId,
        title: candidate.title,
        durationS: candidate.durationS,
      }
      if (candidate.channel) body.channel = candidate.channel
      if (candidate.thumbnailUrl) body.thumbnailUrl = candidate.thumbnailUrl
      return request<{ request?: unknown }>(
        "POST", "/requests", { candidate: body }, token,
      ).then((r) => {
        const parsed = parseTrackRequest(r.request)
        if (!parsed) throw new Error("bad request response")
        return parsed
      })
    },
    myRequests: (token) =>
      request<{ requests?: unknown[] }>("GET", "/requests/mine", undefined, token).then(
        (r) => (r.requests ?? []).flatMap((x) => parseTrackRequest(x) ?? []),
      ),
  }
}
