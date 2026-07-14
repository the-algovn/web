// PoW solver — runs inside a Web Worker (spec §5). Work check:
// SHA-256(tokenBytes || be32(clickCount) || be64(nonce)), read as a 256-bit
// big-endian integer, must be < 2^256 / (workFactor * clickCount), where
// workFactor = w0*L from IssueChallengeResponse and tokenBytes is the ASCII
// bytes of the challenge string exactly as issued (same as the server's
// pow.CheckWork — never decode it).
// jsdom tests import the exported pure functions; only a real Worker runs the
// onmessage loop at the bottom.
import { createSHA256 } from "hash-wasm"

export type SolveRequest = {
  type: "solve"
  jobId: number
  challenge: string
  clickCount: number
  workFactor: string // uint64 decimal string (protojson)
}
export type BenchRequest = { type: "bench"; jobId: number; durationMs: number }
export type SolverRequest = SolveRequest | BenchRequest

export type SolverProgress = { type: "progress"; jobId: number; hashes: number }
export type SolverResult = {
  type: "result"
  jobId: number
  nonce: string // uint64 decimal string
  hashes: number
  elapsedMs: number
}
export type BenchResult = { type: "bench-result"; jobId: number; hashesPerSecond: number }
export type SolverFailure = { type: "error"; jobId: number; message: string }
export type SolverResponse = SolverProgress | SolverResult | BenchResult | SolverFailure

const PROGRESS_EVERY = 50_000

export function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// 2^256 / (workFactor * clickCount) as 32 big-endian bytes.
export function computeTarget(workFactor: bigint, clickCount: number): Uint8Array {
  const divisor = workFactor * BigInt(clickCount)
  const out = new Uint8Array(32)
  if (divisor <= 1n) {
    out.fill(0xff) // target >= 2^256: every hash qualifies
    return out
  }
  let t = (1n << 256n) / divisor
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(t & 0xffn)
    t >>= 8n
  }
  return out
}

export function lessThan(hash: Uint8Array, target: Uint8Array): boolean {
  for (let i = 0; i < 32; i++) {
    const h = hash[i]!
    const t = target[i]!
    if (h !== t) return h < t
  }
  return false
}

export async function solve(
  req: SolveRequest,
  onProgress?: (hashes: number) => void
): Promise<SolverResult> {
  const token = new TextEncoder().encode(req.challenge)
  const target = computeTarget(BigInt(req.workFactor), req.clickCount)
  const input = new Uint8Array(token.length + 4 + 8)
  input.set(token, 0)
  const view = new DataView(input.buffer)
  view.setUint32(token.length, req.clickCount) // DataView defaults to big-endian
  const hasher = await createSHA256()
  const started = performance.now()
  let hashes = 0
  for (let nonce = 0n; ; nonce++) {
    view.setBigUint64(token.length + 4, nonce)
    hasher.init()
    hasher.update(input)
    const digest = hasher.digest("binary")
    hashes++
    if (lessThan(digest, target)) {
      return {
        type: "result",
        jobId: req.jobId,
        nonce: nonce.toString(),
        hashes,
        elapsedMs: performance.now() - started,
      }
    }
    if (hashes % PROGRESS_EVERY === 0) onProgress?.(hashes)
  }
}

// Measures raw sustained SHA-256 throughput (calibration input for POW_W0).
export async function bench(durationMs: number): Promise<number> {
  const hasher = await createSHA256()
  const input = new Uint8Array(120) // ~ token + be32 + be64 sized payload
  const view = new DataView(input.buffer)
  const started = performance.now()
  let hashes = 0
  while (performance.now() - started < durationMs) {
    for (let i = 0; i < 10_000; i++, hashes++) {
      view.setBigUint64(112, BigInt(hashes))
      hasher.init()
      hasher.update(input)
      hasher.digest("binary")
    }
  }
  return Math.round((hashes / (performance.now() - started)) * 1000)
}

// ---- Worker message loop ----
const post = (msg: SolverResponse) =>
  (self as unknown as { postMessage(m: SolverResponse): void }).postMessage(msg)

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  const req = e.data
  void (async () => {
    try {
      if (req.type === "solve") {
        post(await solve(req, hashes => post({ type: "progress", jobId: req.jobId, hashes })))
      } else {
        post({ type: "bench-result", jobId: req.jobId, hashesPerSecond: await bench(req.durationMs) })
      }
    } catch (err) {
      post({
        type: "error",
        jobId: req.jobId,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })()
}
