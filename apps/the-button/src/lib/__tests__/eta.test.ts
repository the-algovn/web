import { describe, expect, it } from "vitest"
import { createEtaEstimator, formatEta } from "../eta"

function clock(start = 0) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe("createEtaEstimator", () => {
  it("reports calculating until it has a rate", () => {
    const est = createEtaEstimator({ now: () => 0 })
    expect(est.eta().text).toBe("calculating…")
    est.sample(100) // one sample is not yet a rate
    expect(est.eta().text).toBe("calculating…")
  })

  it("projects time-to-target from a steady rate", () => {
    const c = clock()
    const est = createEtaEstimator({
      target: 1_000_000,
      tauMs: 1_000,
      now: c.now,
    })
    est.sample(0)
    c.advance(1_000)
    est.sample(1_000) // 1,000 clicks in 1s => 1,000/s
    const eta = est.eta()
    expect(eta.seconds).not.toBeNull()
    expect(eta.seconds!).toBeGreaterThan(900)
    expect(eta.seconds!).toBeLessThan(1_100)
  })

  it("clamps a negative delta (counter reset) to no rate contribution", () => {
    const c = clock()
    const est = createEtaEstimator({ tauMs: 1_000, now: c.now })
    est.sample(1_000)
    c.advance(1_000)
    est.sample(500) // went backwards
    expect(est.eta().text).toBe("—")
  })
})

describe("formatEta", () => {
  const YEAR = 365.25 * 24 * 60 * 60 * 1000
  it("renders billions of years at target scale", () => {
    expect(formatEta(3.2e9 * YEAR)).toBe("~3.2 billion years")
  })
  it("renders thousands of years", () => {
    expect(formatEta(2_400 * YEAR)).toBe("~2.4k years")
  })
  it("renders days under a year", () => {
    expect(formatEta(10 * 24 * 60 * 60 * 1000)).toBe("~10 days")
  })
})
