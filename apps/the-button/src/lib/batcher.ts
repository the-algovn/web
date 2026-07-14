// Click batching state machine (spec §5): clicks accumulate; a batch freezes
// and starts solving immediately, overlapping the solve with whatever remains
// of the min_interval wait; the submit itself never fires before
// max(min_interval, solve_time) has elapsed since the last submit
// (server-side SETNX throttle would 429 it otherwise); the response's
// next_challenge keeps the pipeline full.
import {
  isExpiredChallenge,
  isOutcomeUnknown,
  isRateLimited,
  isReplay,
  type Achievement,
  type IssueChallengeResponse,
  type SubmitClicksRequest,
  type SubmitClicksResponse,
} from "./api"
import type { Solver } from "./solverClient"

export interface BatcherApi {
  issueChallenge(intendedClicks: number, token: string): Promise<IssueChallengeResponse>
  submitClicks(req: SubmitClicksRequest, token: string): Promise<SubmitClicksResponse>
}

export interface BatcherOptions {
  api: BatcherApi
  solver: Solver
  getToken: () => string | null
  onUserTotal?: (total: number) => void
  onUnlocked?: (unlocked: Achievement[]) => void
  onPendingChange?: (pending: number) => void
  onError?: (err: unknown) => void
  // No longer changes flush timing (the solve now always starts immediately
  // — see schedule()); kept as an accepted option for API compatibility.
  flushAt?: number
}

const DEFAULT_FLUSH_AT = 300
const DEFAULT_MIN_INTERVAL_S = 2
const DEFAULT_MAX_BATCH = 10_000
const DEFAULT_WORK_FACTOR = "16384" // matches the POW_W0 default; server value always wins
const MAX_SUBMIT_ATTEMPTS = 3
const FAILURE_BACKOFF_MS = 2_000
const EXPIRY_MARGIN_MS = 10_000

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export class Batcher {
  private pending = 0
  private challenge: IssueChallengeResponse | null = null
  private inFlight = false
  private lastSubmitAt = 0
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly flushAt: number

  constructor(private readonly opts: BatcherOptions) {
    this.flushAt = opts.flushAt ?? DEFAULT_FLUSH_AT
  }

  get pendingCount(): number {
    return this.pending
  }

  click(): void {
    this.pending++
    this.opts.onPendingChange?.(this.pending)
    this.schedule()
  }

  private minIntervalMs(): number {
    return (this.challenge?.minIntervalSeconds ?? DEFAULT_MIN_INTERVAL_S) * 1000
  }

  private schedule(): void {
    if (this.inFlight || this.pending === 0 || this.flushTimer) return
    // Kick off the flush right away: flush() overlaps the solve with
    // whatever remains of the min-interval wait, so starting late here would
    // just re-introduce that dead time in front of the solve.
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this.flush()
    }, 0)
  }

  private async flush(): Promise<void> {
    if (this.inFlight || this.pending === 0) return
    const token = this.opts.getToken()
    if (!token) return // signed out (or token expired): clicks stay pending
    this.inFlight = true
    try {
      if (this.challenge && expiringSoon(this.challenge)) this.challenge = null
      if (!this.challenge?.challenge) {
        this.challenge = await this.opts.api.issueChallenge(this.pending, token)
      }
      const active = this.challenge
      const count = Math.min(this.pending, active.maxBatch ?? DEFAULT_MAX_BATCH)
      // Overlap the solve with whatever remains of the min-interval wait, so
      // the submit fires at max(min_interval, solve_time) rather than their
      // sum: the click_count baked into `solved` is frozen at this count —
      // any clicks arriving while it solves stay pending for the next batch.
      const remaining = this.lastSubmitAt + this.minIntervalMs() - Date.now()
      const [solved] = await Promise.all([
        this.opts.solver.solve({
          challenge: active.challenge ?? "",
          clickCount: count,
          workFactor: active.workFactor ?? DEFAULT_WORK_FACTOR,
        }),
        remaining > 0 ? sleep(remaining) : Promise.resolve(),
      ])
      await this.submit(
        { challenge: active.challenge ?? "", nonce: solved.nonce, clickCount: count },
        token,
        1
      )
    } catch (err) {
      this.opts.onError?.(err)
      await sleep(FAILURE_BACKOFF_MS)
    } finally {
      this.inFlight = false
      this.schedule() // anything still pending (new clicks, replay, expiry) retries here
    }
  }

  private async submit(req: SubmitClicksRequest, token: string, attempt: number): Promise<void> {
    try {
      const res = await this.opts.api.submitClicks(req, token)
      this.lastSubmitAt = Date.now()
      this.pending -= req.clickCount
      this.opts.onPendingChange?.(this.pending)
      this.challenge = res.nextChallenge ?? null
      if (res.userTotalClicks !== undefined) this.opts.onUserTotal?.(Number(res.userTotalClicks))
      if (res.unlocked?.length) this.opts.onUnlocked?.(res.unlocked)
    } catch (err) {
      if (isRateLimited(err) && attempt < MAX_SUBMIT_ATTEMPTS) {
        // 429: the server un-burned the challenge — same nonce stays valid.
        await sleep((err.retryAfterSeconds ?? 2) * 1000)
        return this.submit(req, token, attempt + 1)
      }
      if (isReplay(err) || isExpiredChallenge(err)) {
        // 409 burned or 400 expired: drop this solution; the next flush
        // re-issues a fresh challenge and re-solves for the pending clicks.
        this.challenge = null
        return
      }
      if (isOutcomeUnknown(err)) {
        // 502: Postgres may have already durably committed this batch.
        // MANDATORY: discard it for good — never re-queue or resubmit these
        // clicks under a fresh challenge, or an ambiguous-but-landed commit
        // gets double-credited. The next successful submit's authoritative
        // user_total_clicks reconciles the optimistic total.
        this.pending -= req.clickCount
        this.opts.onPendingChange?.(this.pending)
        this.challenge = null
        return
      }
      throw err
    }
  }
}

function expiringSoon(challenge: IssueChallengeResponse): boolean {
  if (!challenge.expiresAt) return false
  // solving + submitting takes time — leave a safety margin
  return Date.parse(challenge.expiresAt) - EXPIRY_MARGIN_MS < Date.now()
}
