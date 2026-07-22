import { describe, expect, it } from "vitest"
import { mmss, relativeTime } from "../format"
import { progressOf } from "../progress"
import type { NowPlaying } from "../radio-client"

const START = "2026-07-23T10:00:00.000Z"
const startMs = Date.parse(START)

const np = (over: Partial<NowPlaying> = {}): NowPlaying => ({
  kind: "track",
  title: "T",
  startedAt: START,
  durationSeconds: 200,
  listeners: 1,
  ...over,
})

describe("progressOf", () => {
  it("reports elapsed, remaining and fraction mid-track", () => {
    expect(progressOf(np(), startMs + 50_000)).toEqual({
      elapsedS: 50,
      remainingS: 150,
      fraction: 0.25,
    })
  })

  it("clamps before the start", () => {
    expect(progressOf(np(), startMs - 10_000)).toEqual({
      elapsedS: 0,
      remainingS: 200,
      fraction: 0,
    })
  })

  it("clamps past the end", () => {
    expect(progressOf(np(), startMs + 999_000)).toEqual({
      elapsedS: 200,
      remainingS: 0,
      fraction: 1,
    })
  })

  it("degrades safely on a zero duration or unparseable start", () => {
    expect(progressOf(np({ durationSeconds: 0 }), startMs)).toEqual({
      elapsedS: 0,
      remainingS: 0,
      fraction: 0,
    })
    expect(progressOf(np({ startedAt: "not-a-date" }), startMs)).toEqual({
      elapsedS: 0,
      remainingS: 200,
      fraction: 0,
    })
  })
})

describe("mmss", () => {
  it("pads seconds and floors fractions", () => {
    expect(mmss(0)).toBe("0:00")
    expect(mmss(9.9)).toBe("0:09")
    expect(mmss(61)).toBe("1:01")
    expect(mmss(600)).toBe("10:00")
  })

  it("never renders a negative clock", () => {
    expect(mmss(-5)).toBe("0:00")
  })
})

describe("relativeTime", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z")
  const ago = (seconds: number) =>
    new Date(now - seconds * 1000).toISOString()

  it("calls the last minute 'vừa xong'", () => {
    expect(relativeTime(ago(0), now)).toBe("vừa xong")
    expect(relativeTime(ago(44), now)).toBe("vừa xong")
  })

  it("counts minutes, then hours, then days", () => {
    expect(relativeTime(ago(120), now)).toBe("2 phút trước")
    expect(relativeTime(ago(3 * 3600), now)).toBe("3 giờ trước")
    expect(relativeTime(ago(2 * 86400), now)).toBe("2 ngày trước")
  })

  it("never counts backwards from a clock-skewed future stamp", () => {
    expect(relativeTime(ago(-500), now)).toBe("vừa xong")
  })

  it("is empty for an unparseable stamp", () => {
    expect(relativeTime("not-a-date", now)).toBe("")
  })
})
