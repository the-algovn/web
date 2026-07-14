import { createSHA256 } from "hash-wasm"
import { expect, it } from "vitest"
import { base64UrlDecode, computeTarget, lessThan, solve } from "../solver"

it("decodes base64url without padding", () => {
  // base64url("hi?") — the '?' exercises the '_' -> '/' mapping
  expect(Array.from(base64UrlDecode("aGk_"))).toEqual([104, 105, 63])
})

it("computes the smooth full target 2^256/(workFactor*count) big-endian", () => {
  // 2^256 / 2^248 = 2^8 = 256 -> bytes ...00 01 00
  const target = computeTarget(1n << 248n, 1)
  expect(Array.from(target.slice(0, 30)).every(b => b === 0)).toBe(true)
  expect(target[30]).toBe(1)
  expect(target[31]).toBe(0)
  // degenerate divisor: everything qualifies
  expect(Array.from(computeTarget(1n, 1)).every(b => b === 0xff)).toBe(true)
})

it("compares digests as 256-bit big-endian integers", () => {
  const target = computeTarget(1n << 248n, 1) // 256
  const below = new Uint8Array(32)
  below[31] = 0xff // 255
  const equal = new Uint8Array(32)
  equal[30] = 1 // 256
  const above = new Uint8Array(32)
  above[29] = 1
  expect(lessThan(below, target)).toBe(true)
  expect(lessThan(equal, target)).toBe(false)
  expect(lessThan(above, target)).toBe(false)
})

it("finds a nonce whose hash beats the target (independently re-verified)", async () => {
  const challenge = "dGVzdC1jaGFsbGVuZ2U" // base64url("test-challenge")
  const clickCount = 3
  const result = await solve({
    type: "solve",
    jobId: 1,
    challenge,
    clickCount,
    workFactor: "64",
  })
  expect(result.type).toBe("result")
  expect(result.hashes).toBeGreaterThan(0)
  // recompute SHA-256(tokenBytes || be32(count) || be64(nonce)) from scratch
  const token = new TextEncoder().encode(challenge)
  const input = new Uint8Array(token.length + 4 + 8)
  input.set(token, 0)
  const view = new DataView(input.buffer)
  view.setUint32(token.length, clickCount)
  view.setBigUint64(token.length + 4, BigInt(result.nonce))
  const hasher = await createSHA256()
  hasher.init()
  hasher.update(input)
  const digest = hasher.digest("binary")
  expect(lessThan(digest, computeTarget(64n, clickCount))).toBe(true)
})
