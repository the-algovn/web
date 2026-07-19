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
        nextChallenge: challenge({ challenge: "chal-2" }),
      })
    ),
  }
  return { solver, api }
}

// A solver that also exposes bench() (like the real WorkerSolver), so the
// batcher's lazy hash-rate warm-up has something to measure. The same
// challenge/work_factor is piggybacked across batches to keep the math
// predictable.
function makeDepsWithBench(hashRatePerSecond: number, workFactor: string) {
  const chal = challenge({ workFactor })
  const solver = {
    solve: vi.fn(async (input: { clickCount: number }) => ({
      type: "result" as const,
      jobId: 1,
      nonce: "42",
      hashes: 10 * input.clickCount,
      elapsedMs: 5,
    })),
    bench: vi.fn(async () => hashRatePerSecond),
  }
  const api = {
    issueChallenge: vi.fn(async (_clicks: number, _token: string) => chal),
    submitClicks: vi.fn(
      async (_req: SubmitClicksRequest, _token: string): Promise<SubmitClicksResponse> => ({
        nextChallenge: chal,
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
  const onPendingChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onPendingChange })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).toHaveBeenCalledWith(1, "tok")
  expect(solver.solve).toHaveBeenCalledWith({ challenge: "chal-1", clickCount: 1, workFactor: "16384" })
  expect(api.submitClicks).toHaveBeenCalledWith(
    { challenge: "chal-1", nonce: "42", clickCount: 1 },
    "tok"
  )
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
    .mockResolvedValueOnce({ nextChallenge: undefined })
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
    .mockResolvedValueOnce({ nextChallenge: undefined })
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenCalledTimes(2)
})

it("starts solving immediately once clicks are pending, but still throttles the submit", async () => {
  const { solver, api } = makeDeps()
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(10) // batch 1 done -> lastSubmitAt set
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  b.click()
  b.click()
  b.click() // solve starts now, without waiting the 2s
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

// Task 20: solve cost is linear in click_count (expected hashes ≈
// work_factor × click_count), so a batch sized by click count alone can hand
// the worker minutes of hashing. The batch must instead be capped by a
// solve-time budget (hashRate * TARGET_SOLVE_SECONDS / work_factor), and that
// budget must re-clamp on every flush as work_factor changes.
it("sizes a batch by a solve-time budget, capping a large pending backlog", async () => {
  const { solver, api } = makeDepsWithBench(200_000, "2048")
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click() // warm-up click: kicks off the hash-rate bench in the background
  await vi.advanceTimersByTimeAsync(10)
  expect(solver.bench).toHaveBeenCalledTimes(1)

  for (let i = 0; i < 5_000; i++) b.click()
  await vi.advanceTimersByTimeAsync(10) // batch 2's solve starts; submit still gated by min_interval
  // budget: 200k H/s * 1.5s / 2048 work_factor = 146.48... -> floor 146
  expect(solver.solve).toHaveBeenLastCalledWith({
    challenge: "chal-1",
    clickCount: 146,
    workFactor: "2048",
  })
  await vi.advanceTimersByTimeAsync(2_000)
  expect(api.submitClicks.mock.calls[1]![0]).toEqual({
    challenge: "chal-1",
    nonce: "42",
    clickCount: 146,
  })
  expect(b.pendingCount).toBe(5_000 - 146) // the remainder stays pending for the next batch
})

it("shrinks the batch when the server raises difficulty (higher work_factor)", async () => {
  const { solver, api } = makeDepsWithBench(200_000, "32768")
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click() // warm-up click: kicks off the hash-rate bench in the background
  await vi.advanceTimersByTimeAsync(10)

  for (let i = 0; i < 5_000; i++) b.click()
  await vi.advanceTimersByTimeAsync(10)
  // budget: 200k H/s * 1.5s / 32768 work_factor = 9.15... -> floor 9 — the
  // valve shrinks the batch proportionally to the raised difficulty.
  expect(solver.solve).toHaveBeenLastCalledWith({
    challenge: "chal-1",
    clickCount: 9,
    workFactor: "32768",
  })
  await vi.advanceTimersByTimeAsync(2_000)
  expect(api.submitClicks.mock.calls[1]![0]).toEqual({
    challenge: "chal-1",
    nonce: "42",
    clickCount: 9,
  })
})

it("never sizes a batch below 1 click, even under an absurd work_factor", async () => {
  const { solver, api } = makeDeps()
  api.issueChallenge.mockResolvedValue(challenge({ workFactor: "100000000" }))
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  for (let i = 0; i < 10; i++) b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  expect(api.submitClicks.mock.calls[0]![0].clickCount).toBe(1) // never 0 — an invalid batch
  expect(b.pendingCount).toBe(9) // the other 9 clicks stay pending for the next batch
})

// Task 15's overlap fix: flush a batch after max(min_interval, solve_time),
// never their sum — the solve must run concurrently with the remaining
// min-interval wait, not sequentially after it.
it("overlaps the proof-of-work solve with the min-interval wait instead of adding them", async () => {
  const { api } = makeDeps()
  const solve: Solver["solve"] = () =>
    new Promise(resolve => {
      setTimeout(
        () => resolve({ type: "result", jobId: 1, nonce: "42", hashes: 1, elapsedMs: 300 }),
        300
      )
    })
  const solver: Solver = { solve: vi.fn(solve) }
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click()
  await vi.advanceTimersByTimeAsync(350) // batch 1 settles (300ms solve) -> lastSubmitAt fixed
  expect(api.submitClicks).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(500) // a click arrives mid-interval
  b.click()

  // Correct: submit fires at max(remaining_min_interval, solve_time) =
  // lastSubmitAt+2000 — never their sum (lastSubmitAt+2000+300), which an
  // additive (wait-then-solve) implementation would produce instead.
  await vi.advanceTimersByTimeAsync(1_350) // still short of both targets
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(250) // past the correct target, short of the additive-bug one
  expect(api.submitClicks).toHaveBeenCalledTimes(2)
})

it("does not fold clicks that arrive during an in-flight solve into that batch", async () => {
  const { api } = makeDeps()
  const solve: Solver["solve"] = () =>
    new Promise(resolve => {
      setTimeout(
        () => resolve({ type: "result", jobId: 1, nonce: "42", hashes: 1, elapsedMs: 300 }),
        300
      )
    })
  const solver: Solver = { solve: vi.fn(solve) }
  const b = new Batcher({ api, solver, getToken: () => "tok" })
  b.click() // 1 click kicks off a solve bound to clickCount=1
  await vi.advanceTimersByTimeAsync(50) // solve still in flight (300ms total)
  b.click()
  b.click()
  b.click()
  b.click()
  b.click() // 5 more clicks arrive mid-solve
  expect(b.pendingCount).toBe(6)
  await vi.advanceTimersByTimeAsync(300) // let the in-flight solve settle and submit
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  expect(api.submitClicks.mock.calls[0]![0]).toMatchObject({ clickCount: 1 })
  expect(b.pendingCount).toBe(5) // the 5 late clicks stay pending for the next batch
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
      nextChallenge: challenge({ challenge: "chal-3" }),
    })
  const onPendingChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onPendingChange })
  b.click()
  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  // the 2-click batch is gone for good: not retried, not carried into pending
  expect(b.pendingCount).toBe(0)
  expect(onPendingChange).toHaveBeenLastCalledWith(0)

  // a fresh click starts a brand-new batch with a freshly issued challenge —
  // the discarded clicks are never folded back in
  b.click()
  await vi.advanceTimersByTimeAsync(2_000)
  expect(api.issueChallenge).toHaveBeenCalledTimes(2)
  expect(api.submitClicks).toHaveBeenLastCalledWith(
    { challenge: "chal-2", nonce: "42", clickCount: 1 },
    "tok"
  )
})

it("keeps retrying after a token gap instead of stranding pending clicks", async () => {
  const { solver, api } = makeDeps()
  let token: string | null = null // mid silent-renewal
  const onPendingChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => token, onPendingChange })

  b.click()
  await vi.advanceTimersByTimeAsync(10)
  expect(api.issueChallenge).not.toHaveBeenCalled() // nothing to submit with yet

  // The token arrives on its own. No further click() happens — the batcher
  // must pick the pending click back up by itself.
  token = "tok"
  await vi.advanceTimersByTimeAsync(600)
  expect(api.submitClicks).toHaveBeenCalledTimes(1)
  expect(onPendingChange).toHaveBeenLastCalledWith(0)
})

it("reports a stall when clicks sit pending for 10s, and clears it when one lands", async () => {
  const { solver } = makeDeps()
  let down = true
  const api = {
    issueChallenge: vi.fn(async (_clicks: number, _token: string) => challenge()),
    submitClicks: vi.fn(
      async (_req: SubmitClicksRequest, _token: string): Promise<SubmitClicksResponse> => {
        if (down) throw new Error("network down")
        return { nextChallenge: challenge() }
      }
    ),
  }
  const onStallChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onStallChange, onError: () => {} })

  b.click()
  await vi.advanceTimersByTimeAsync(9_000)
  expect(onStallChange).not.toHaveBeenCalled() // still inside the threshold

  await vi.advanceTimersByTimeAsync(1_500)
  expect(onStallChange).toHaveBeenLastCalledWith(true)

  down = false
  await vi.advanceTimersByTimeAsync(5_000)
  expect(onStallChange).toHaveBeenLastCalledWith(false)
  b.dispose()
})

it("does not report a stall when batches land normally", async () => {
  const { solver, api } = makeDeps()
  const onStallChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onStallChange })

  b.click()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(onStallChange).not.toHaveBeenCalled()
  b.dispose()
})

it("clears the stall hint immediately when a 502 discards the last pending clicks", async () => {
  const { solver } = makeDeps()
  let mode: "fail" | "502" = "fail"
  const api = {
    issueChallenge: vi.fn(async (_clicks: number, _token: string) => challenge()),
    submitClicks: vi.fn(async (_req: SubmitClicksRequest, _token: string): Promise<SubmitClicksResponse> => {
      if (mode === "502") throw new ApiError(502, "Unavailable", "upstream unavailable")
      throw new Error("network down")
    }),
  }
  const onStallChange = vi.fn()
  const b = new Batcher({ api, solver, getToken: () => "tok", onStallChange, onError: () => {} })

  // generic failures keep the click pending; after 10s the stall hint shows
  b.click()
  await vi.advanceTimersByTimeAsync(10_500)
  expect(onStallChange).toHaveBeenLastCalledWith(true)

  // the server now 502s: the batch is discarded and pending hits 0. The hint
  // must clear right away, not linger until the armed 10s stall timer fires.
  mode = "502"
  await vi.advanceTimersByTimeAsync(4_000) // well under STALL_AFTER_MS
  expect(b.pendingCount).toBe(0)
  expect(onStallChange).toHaveBeenLastCalledWith(false)
  b.dispose()
})
