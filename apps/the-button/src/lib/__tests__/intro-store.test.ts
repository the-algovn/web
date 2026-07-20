import { beforeEach, describe, expect, it, vi } from "vitest"
import { introSeen, markIntroSeen } from "../intro-store"

beforeEach(() => {
  localStorage.clear()
})

describe("introSeen", () => {
  it("is false before the intro was ever finished or skipped", () => {
    expect(introSeen()).toBe(false)
  })

  it("is true after markIntroSeen", () => {
    markIntroSeen()
    expect(introSeen()).toBe(true)
  })

  it("reports seen when storage is blocked, so users are never nagged every visit", () => {
    const blocked = {
      getItem: vi.fn(() => {
        throw new Error("denied")
      }),
    } as unknown as Storage
    expect(introSeen(blocked)).toBe(true)
  })
})

describe("markIntroSeen", () => {
  it("swallows storage write errors", () => {
    const blocked = {
      setItem: vi.fn(() => {
        throw new Error("full")
      }),
    } as unknown as Storage
    expect(() => markIntroSeen(blocked)).not.toThrow()
  })
})
