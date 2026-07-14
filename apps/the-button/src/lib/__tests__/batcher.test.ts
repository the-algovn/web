import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  ApiError,
  type IssueChallengeResponse,
  type SubmitClicksRequest,
  type SubmitClicksResponse,
} from "../api"
import { Batcher } from "../batcher"
import type { Solver } from "../solverClient"

const challenge = (over: Partial<IssueChallengeResponse> = {}): IssueChallengeResponse => ({
  challenge: "chal-1",
  workFactor: "16384",
  minIntervalSeconds: 2,
  maxBatch: 10000,
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  ...over,
})

function makeDeps() {
  const solver: Solver = {
    solve: vi.fn(async (input: { clickCount: number }) => ({
      type: "result" as const,
      jobId: 1,
      nonce: "42",
      hashes: 10 * input.clickCount,
      elapsedMs: 5,
    })),
  }
  const api = {
    issueChallenge: vi.fn(async (_clicks: number, _token: string) => challenge()),
    submitClicks: vi.fn(
      async (_req: SubmitClicksRequest, _token: string): Promise<SubmitClicksResponse> => ({
        userTotalClicks: "10",
        unlocked: [],
        nextChallenge: challenge({ challenge: "chal-2" }),
      })
    ),
  }
  return { solver, api }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it("issues, solves and submits a single click, then keeps the piggybacked challenge", async () => {
  const { solver, api } = makeDeps()
  const onUserTotal = vi.fn()
  const onPendingChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onUserTotal, onPendingChange })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).toHaveBeenCalledWith(1, "tok")
  expect(solver.solve).toHaveBeenCalledWith({ challenge: "chal-1", clickCount: 1, workFactor: "16384" })
  expect(api.submitClicks).toHaveBeenCalledWith(
    { challenge: "chal-1", nonce: "42", clickCount: 1 },
    "tok"
  )
  expect(onUserTotal).toHaveBeenCalledWith(10)
  expect(onPendingChange).toHaveBeenLastCalledWith(0)

  // second batch reuses next_challenge and waits out min_interval (2s);
  // margins avoid asserting exactly on the timer boundary
  b.click()
  b.click()
  await vi.advanceTimersByTimeAsync(1_900)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(200)
  expect(api.issueChallenge).toHaveBeenCalledTimes(1) // no re-issue
  expect(api.submitClicks).toHaveBeenLastCalledWith(
    { challenge: "chal-2", nonce: "42", clickCount: 2 },
    "tok"
  )
})

it("honors Retry-After on 429 and resubmits the SAME solved batch", async () => {
  const { solver, api } = makeDeps()
  api.submitClicks
    .mockRejectedValueOnce(new ApiError(429, "ResourceExhausted", "slow down", 5))
    .mockResolvedValueOnce({
      userTotalClicks: "1",
      unlocked: [],
      nextChallenge: challenge({ challenge: "chal-2" }),
    })
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(5_000) // Retry-After: 5
  expect(api.submitClicks).toHaveBeenCalledTimes(2)
  expect(api.submitClicks.mock.calls[1]![0]).toEqual({
    challenge: "chal-1",
    nonce: "42",
    clickCount: 1,
  })
  expect(api.issueChallenge).toHaveBeenCalledTimes(1) // token still valid, no re-issue
  expect(solver.solve).toHaveBeenCalledTimes(1) // no re-solve
})

it("re-issues and re-solves after a 409 replay", async () => {
  const { solver, api } = makeDeps()
  api.issueChallenge
    .mockResolvedValueOnce(challenge())
    .mockResolvedValueOnce(challenge({ challenge: "chal-1b" }))
  api.submitClicks
    .mockRejectedValueOnce(new ApiError(409, "AlreadyExists", "replay"))
    .mockResolvedValueOnce({ userTotalClicks: "1", unlocked: [], nextChallenge: undefined })
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).toHaveBeenCalledTimes(2)
  expect(solver.solve).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenLastCalledWith(
    { challenge: "chal-1b", nonce: "42", clickCount: 1 },
    "tok"
  )
})

it("re-issues after a 400 expired challenge", async () => {
  const { solver, api } = makeDeps()
  api.issueChallenge
    .mockResolvedValueOnce(challenge())
    .mockResolvedValueOnce(challenge({ challenge: "chal-1b" }))
  api.submitClicks
    .mockRejectedValueOnce(new ApiError(400, "FailedPrecondition", "challenge_expired"))
    .mockResolvedValueOnce({ userTotalClicks: "1", unlocked: [], nextChallenge: undefined })
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenCalledTimes(2)
})

it("starts solving immediately at flushAt pending clicks, but still throttles the submit", async () => {
  const { solver, api } = makeDeps()
  const b = new Batcher({ api, solver, getToken: () => "tok", flushAt: 3 })
  b.click()
  await vi.advanceTimersByTimeAsync(10) // batch 1 done -> lastSubmitAt set
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  b.click()
  b.click()
  b.click() // hits flushAt -> solve starts now, without waiting the 2s
  await vi.advanceTimersByTimeAsync(10)
  expect(solver.solve).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenCalledTimes(1) // submit still gated by min_interval
  await vi.advanceTimersByTimeAsync(2_000)
  expect(api.submitClicks).toHaveBeenCalledTimes(2)
  expect(api.submitClicks.mock.calls[1]![0]).toEqual({
    challenge: "chal-2",
    nonce: "42",
    clickCount: 3,
  })
})

it("keeps clicks pending while signed out", async () => {
  const { solver, api } = makeDeps()
  const b = new Batcher({ api, solver, getToken: () => null })
  b.click()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(api.issueChallenge).not.toHaveBeenCalled()
  expect(b.pendingCount).toBe(1)
})

// Mandatory money-path contract (spec §5 / Task 13's isOutcomeUnknown guard):
// a 502 means Postgres may have already durably committed the batch. The
// client must drop those clicks for good — never resubmit them under a fresh
// challenge, or the counter double-credits an ambiguous-but-landed commit.
it("discards the batch entirely on a 502 outcome-unknown response, never re-queuing it", async () => {
  const { solver, api } = makeDeps()
  api.issueChallenge
    .mockResolvedValueOnce(challenge())
    .mockResolvedValueOnce(challenge({ challenge: "chal-2" }))
  api.submitClicks
    .mockRejectedValueOnce(new ApiError(502, "Unavailable", "upstream unavailable"))
    .mockResolvedValueOnce({
      userTotalClicks: "99",
      unlocked: [],
      nextChallenge: challenge({ challenge: "chal-3" }),
    })
  const onPendingChange = vi.fn()
  const onUserTotal = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onPendingChange, onUserTotal })
  b.click()
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  // the 2-click batch is gone for good: not retried, not carried into pending
  expect(b.pendingCount).toBe(0)
  expect(onPendingChange).toHaveBeenLastCalledWith(0)
  expect(onUserTotal).not.toHaveBeenCalled() // no fabricated total — wait for the next authoritative response

  // a fresh click starts a brand-new batch with a freshly issued challenge —
  // the discarded clicks are never folded back in
  b.click()
  await vi.advanceTimersByTimeAsync(2_000)
  expect(api.issueChallenge).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenLastCalledWith(
    { challenge: "chal-2", nonce: "42", clickCount: 1 },
    "tok"
  )
  expect(onUserTotal).toHaveBeenCalledWith(99) // reconciled from the next authoritative total
})
