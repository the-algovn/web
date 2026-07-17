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
import type { Solver, WorkerSolver } from "./solverClient"

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
  onStallChange?: (stalled: boolean) => void
  onError?: (err: unknown) => void
}

const DEFAULT_MIN_INTERVAL_S = 2
const DEFAULT_MAX_BATCH = 10_000
const DEFAULT_WORK_FACTOR = "16384" // matches the POW_W0 default; server value always wins
const MAX_SUBMIT_ATTEMPTS = 3
const FAILURE_BACKOFF_MS = 2_000
// A missing token is an expected transient during silent renewal, not a server
// failure — retry sooner than FAILURE_BACKOFF_MS, and well inside STALL_AFTER_MS
// so a normal renewal never surfaces as a stall.
const TOKEN_RETRY_MS = 500
// How long pending clicks may sit with nothing landing before the UI admits
// something is wrong. Time-based rather than error-counting on purpose: it
// watches the symptom, so it catches submit failures, retry storms and token
// gaps alike. Comfortably above a normal max(min_interval, solve_time) cycle
// plus a couple of retries.
const STALL_AFTER_MS = 10_000
const EXPIRY_MARGIN_MS = 10_000
// Solve cost is linear in click_count (expected hashes ≈ work_factor ×
// click_count), so sizing a batch by click count alone lets a big
// accumulation (background tab, autoclicker, a server-raised difficulty L)
// hand the worker a batch that hashes for minutes — a self-inflicted DoS on
// the user's own browser. Size each batch by a solve-time budget instead.
const TARGET_SOLVE_SECONDS = 1.5 // keeps the button responsive; leftover clicks simply go in the next batch
const HASH_RATE_BENCH_MS = 200 // short: must not block the first click on a long benchmark
const DEFAULT_HASH_RATE = 150_000 // conservative fallback if the bench fails or hasn't run yet

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export class Batcher {
  private pending = 0
  private challenge: IssueChallengeResponse | null = null
  private inFlight = false
  private lastSubmitAt = 0
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private hashRate = DEFAULT_HASH_RATE
  private benchStarted = false
  private progressAt = 0
  private stalled = false
  private stallTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: BatcherOptions) {}

  get pendingCount(): number {
    return this.pending
  }

  click(): void {
    if (this.pending === 0) this.progressAt = Date.now() // a fresh wait begins
    this.pending++
    this.opts.onPendingChange?.(this.pending)
    this.armStallCheck(STALL_AFTER_MS)
    this.schedule()
  }

  // Clears pending timers so a torn-down batcher stops re-arming itself.
  dispose(): void {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer)
      this.stallTimer = null
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  private armStallCheck(delay: number): void {
    if (this.stallTimer) return
    this.stallTimer = setTimeout(() => {
      this.stallTimer = null
      this.evaluateStall()
    }, delay)
  }

  private evaluateStall(): void {
    if (this.pending === 0) {
      this.setStalled(false)
      return
    }
    const waited = Date.now() - this.progressAt
    if (waited >= STALL_AFTER_MS) {
      this.setStalled(true)
      this.armStallCheck(STALL_AFTER_MS)
    } else {
      // Re-arm for exactly when it would trip, not a full window later.
      this.setStalled(false)
      this.armStallCheck(STALL_AFTER_MS - waited)
    }
  }

  private setStalled(next: boolean): void {
    if (next === this.stalled) return
    this.stalled = next
    this.opts.onStallChange?.(next)
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
    if (!token) {
      // Signed out, or mid silent-renewal. schedule() is only called from
      // click() and this method's finally, so returning bare here strands
      // every pending click until the user happens to click again — keep the
      // retry loop alive instead.
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        void this.flush()
      }, TOKEN_RETRY_MS)
      return
    }
    this.inFlight = true
    try {
      this.warmUpHashRate()
      if (this.challenge && expiringSoon(this.challenge)) this.challenge = null
      if (!this.challenge?.challenge) {
        this.challenge = await this.opts.api.issueChallenge(this.pending, token)
      }
      const active = this.challenge
      // Budget the batch by expected solve time rather than a fixed click
      // count: re-clamping every flush means a server-raised work_factor
      // automatically shrinks the batch — the load valve just works.
      const cap = Math.min(this.pending, active.maxBatch ?? DEFAULT_MAX_BATCH)
      const workFactor = Number(active.workFactor ?? DEFAULT_WORK_FACTOR)
      const hashBudget = this.hashRate * TARGET_SOLVE_SECONDS
      const count = Math.min(Math.max(Math.floor(hashBudget / workFactor), 1), cap)
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

  // Measures the worker's real hash rate once, lazily, from the solver
  // itself (solverClient's bench(), also used by ?bench mode). Fire-and-
  // forget: the current flush keeps using whatever hashRate it already has
  // (the conservative default until this resolves) so a slow or failed bench
  // never blocks a click from being solved and submitted.
  private warmUpHashRate(): void {
    if (this.benchStarted) return
    this.benchStarted = true
    const solver = this.opts.solver as Partial<WorkerSolver>
    if (typeof solver.bench !== "function") return
    void solver
      .bench(HASH_RATE_BENCH_MS)
      .then(rate => {
        this.hashRate = rate
      })
      .catch(() => {
        // keep the conservative default
      })
  }

  private async submit(req: SubmitClicksRequest, token: string, attempt: number): Promise<void> {
    try {
      const res = await this.opts.api.submitClicks(req, token)
      this.lastSubmitAt = Date.now()
      this.pending -= req.clickCount
      this.opts.onPendingChange?.(this.pending)
      this.progressAt = Date.now()
      this.setStalled(false)
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
        // Discarding a batch is not progress, so don't stamp progressAt — but
        // if that drained the last pending clicks, clear a showing stall hint
        // now rather than leaving it up until the armed timer fires (~10s).
        this.evaluateStall()
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
