import { describe, expect, it } from "vitest"
import type { HistoryItem, NowPlaying, QueueItem } from "../radio-client"
import type { TrackRequest } from "../request-client"
import {
  EMPTY,
  entryKey,
  ingestNowPlaying,
  ingestQueue,
  ingestRequests,
  seed,
} from "../timeline"

const np = (over: Partial<NowPlaying> = {}): NowPlaying => ({
  kind: "track",
  title: "T",
  startedAt: "2026-07-23T10:00:00.000Z",
  durationSeconds: 100,
  listeners: 3,
  ...over,
})

const q = (title: string, over: Partial<QueueItem> = {}): QueueItem => ({
  title,
  hasDedication: false,
  ...over,
})

const h = (title: string, airedAt: string): HistoryItem => ({ title, airedAt })

const req = (over: Partial<TrackRequest> = {}): TrackRequest => ({
  id: "r1",
  source: "listener",
  ytId: "y1",
  title: "Nơi Này Có Anh",
  durationS: 200,
  status: "approved",
  createdAt: "2026-07-23T09:00:00.000Z",
  ...over,
})

describe("seed", () => {
  it("orders past by airedAt descending, ignoring the server's order", () => {
    const s = seed({
      history: [
        h("older", "2026-07-23T09:00:00.000Z"),
        h("newest", "2026-07-23T11:00:00.000Z"),
        h("middle", "2026-07-23T10:00:00.000Z"),
      ],
      queue: [],
    })
    expect(s.past.map((e) => e.title)).toEqual(["newest", "middle", "older"])
    expect(s.past.every((e) => e.witnessed === false)).toBe(true)
  })

  it("keeps future in queue order and starts with no current", () => {
    const s = seed({ history: [], queue: [q("a"), q("b")] })
    expect(s.future.map((e) => e.title)).toEqual(["a", "b"])
    expect(s.current).toBeNull()
  })
})

describe("ingestQueue", () => {
  it("gives an unchanged item the same key across two ingests", () => {
    const first = ingestQueue(EMPTY, [q("a", { artist: "X" })])
    const second = ingestQueue(first, [q("a", { artist: "X" }), q("b")])
    expect(second.future[0]?.key).toBe(first.future[0]?.key)
  })

  it("disambiguates the same song queued twice", () => {
    const s = ingestQueue(EMPTY, [q("a"), q("a")])
    expect(s.future[0]?.key).not.toBe(s.future[1]?.key)
  })
})

describe("ingestNowPlaying", () => {
  const at = Date.parse("2026-07-23T12:00:00.000Z")

  it("sets current on the first call and retires nothing", () => {
    const s = ingestNowPlaying(EMPTY, np({ title: "one" }), at)
    expect(s.current?.title).toBe("one")
    expect(s.current?.witnessed).toBe(true)
    expect(s.past).toHaveLength(0)
  })

  it("retires the outgoing track into past, keeping its dedication text", () => {
    const first = ingestNowPlaying(
      EMPTY,
      np({ title: "one", dedication: "gửi Linh" }),
      at,
    )
    const second = ingestNowPlaying(first, np({ title: "two" }), at)
    expect(second.past[0]?.title).toBe("one")
    expect(second.past[0]?.dedication).toBe("gửi Linh")
    expect(second.past[0]?.witnessed).toBe(true)
    expect(second.past[0]?.airedAt).toBe("2026-07-23T12:00:00.000Z")
    expect(second.current?.title).toBe("two")
  })

  it("drops the queue head only when it is the track that came on air", () => {
    const withQueue = ingestQueue(EMPTY, [q("two"), q("three")])
    const onAir = ingestNowPlaying(withQueue, np({ title: "two" }), at)
    expect(onAir.future.map((e) => e.title)).toEqual(["three"])

    const surprise = ingestNowPlaying(withQueue, np({ title: "zzz" }), at)
    expect(surprise.future.map((e) => e.title)).toEqual(["two", "three"])
  })

  it("is a no-op for past when the same track is still on air", () => {
    const first = ingestNowPlaying(EMPTY, np({ title: "one" }), at)
    const again = ingestNowPlaying(first, np({ title: "one", listeners: 9 }), at)
    expect(again.past).toHaveLength(0)
    expect(again.current?.key).toBe(first.current?.key)
  })

  it("disambiguates a repeat play against the existing past entry", () => {
    let s = ingestNowPlaying(EMPTY, np({ title: "one" }), at)
    s = ingestNowPlaying(s, np({ title: "two" }), at)
    s = ingestNowPlaying(s, np({ title: "one" }), at)
    s = ingestNowPlaying(s, np({ title: "three" }), at)
    const keys = s.past.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("ingestRequests", () => {
  it("keeps approved, ready and failed but drops aired", () => {
    const s = ingestRequests(EMPTY, [
      req({ id: "a", status: "approved", title: "A" }),
      req({ id: "b", status: "ready", title: "B" }),
      req({ id: "c", status: "failed", title: "C" }),
      req({ id: "d", status: "aired", title: "D" }),
    ])
    expect(s.pending.map((e) => e.title)).toEqual(["A", "B", "C"])
  })

  it("drops a request whose title is already queued, current or past", () => {
    const withQueue = ingestQueue(EMPTY, [q("Queued")])
    const s = ingestRequests(withQueue, [
      req({ id: "a", title: "Queued" }),
      req({ id: "b", title: "Fresh" }),
    ])
    expect(s.pending.map((e) => e.title)).toEqual(["Fresh"])
  })
})

describe("entryKey", () => {
  it("separates title from artist so concatenation cannot collide", () => {
    expect(entryKey("ab", "c")).not.toBe(entryKey("a", "bc"))
  })
})
