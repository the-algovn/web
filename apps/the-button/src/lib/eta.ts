import { TARGET } from "./progress"

const DEFAULT_TAU_MS = 30_000
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

export interface Eta {
  seconds: number | null
  text: string
}

export interface EtaEstimator {
  sample(total: number): void
  eta(): Eta
}

export interface EtaOptions {
  target?: number
  tauMs?: number
  now?: () => number
}

// createEtaEstimator tracks a time-decayed clicks/ms rate from successive
// (total, now) samples and projects time-to-target. The rate is EWMA'd with
// time constant tauMs so bursts don't whipsaw it; a counter reset or reconnect
// (negative delta) clamps to 0 and never corrupts the rate.
export function createEtaEstimator(opts: EtaOptions = {}): EtaEstimator {
  const target = opts.target ?? TARGET
  const tauMs = opts.tauMs ?? DEFAULT_TAU_MS
  const now = opts.now ?? (() => performance.now())

  let lastTotal: number | null = null
  let lastAt = 0
  let ratePerMs = 0
  let haveRate = false
  let latestTotal = 0

  return {
    sample(total: number) {
      latestTotal = total
      const t = now()
      if (lastTotal === null) {
        lastTotal = total
        lastAt = t
        return
      }
      const dt = t - lastAt
      if (dt <= 0) return
      const instant = Math.max(0, total - lastTotal) / dt
      const alpha = 1 - Math.exp(-dt / tauMs)
      ratePerMs = haveRate ? ratePerMs + alpha * (instant - ratePerMs) : instant
      haveRate = true
      lastTotal = total
      lastAt = t
    },
    eta(): Eta {
      if (!haveRate) return { seconds: null, text: "calculating…" }
      if (ratePerMs <= 0) return { seconds: null, text: "—" }
      const ms = Math.max(0, target - latestTotal) / ratePerMs
      return { seconds: ms / 1000, text: formatEta(ms) }
    },
  }
}

// formatEta renders coarse, human durations. At the quadrillion target the
// answer is dominated by years — often absurdly many, which is the point.
export function formatEta(ms: number): string {
  const years = ms / MS_PER_YEAR
  if (years < 1) {
    const days = ms / (24 * 60 * 60 * 1000)
    return days < 1 ? "< a day" : `~${Math.round(days).toLocaleString("en-US")} days`
  }
  if (years >= 1e9) return `~${(years / 1e9).toFixed(1)} billion years`
  if (years >= 1e6) return `~${(years / 1e6).toFixed(1)} million years`
  if (years >= 1e3) return `~${(years / 1e3).toFixed(1)}k years`
  return `~${Math.round(years).toLocaleString("en-US")} years`
}
