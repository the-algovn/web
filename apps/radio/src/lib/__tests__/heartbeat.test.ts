import { afterEach, describe, expect, it, vi } from "vitest"
import { sessionId, startHeartbeat } from "../heartbeat"

afterEach(() => vi.useRealTimers())

describe("sessionId", () => {
  it("persists a stable id in the store", () => {
    const map = new Map<string, string>()
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
    let n = 0
    const a = sessionId(store, () => `uuid-${n++}`)
    const b = sessionId(store, () => `uuid-${n++}`)
    expect(a).toBe("uuid-0")
    expect(b).toBe("uuid-0")
  })
})

describe("startHeartbeat", () => {
  it("pings immediately and on the interval, then stops", () => {
    vi.useFakeTimers()
    const client = { heartbeat: vi.fn().mockResolvedValue(undefined) }
    const stop = startHeartbeat(client, { intervalMs: 30_000, sessionId: "s1" })
    expect(client.heartbeat).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_000)
    expect(client.heartbeat).toHaveBeenCalledTimes(3)
    stop()
    vi.advanceTimersByTime(60_000)
    expect(client.heartbeat).toHaveBeenCalledTimes(3)
  })
})
