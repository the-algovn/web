import { act, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import type { HistoryItem, NowPlaying, QueueItem } from "../radio-client"
import type { TrackRequest } from "../request-client"
import { useTimeline } from "../use-timeline"

const np = (title: string, over: Partial<NowPlaying> = {}): NowPlaying => ({
  kind: "track",
  title,
  startedAt: "2026-07-23T10:00:00.000Z",
  durationSeconds: 100,
  listeners: 2,
  ...over,
})

interface Input {
  nowPlaying: NowPlaying | null
  queue: QueueItem[]
  history: HistoryItem[]
  requests: TrackRequest[]
}

let setInput: (i: Input) => void

function Harness({ initial }: { initial: Input }) {
  const [input, set] = useState(initial)
  setInput = set
  const t = useTimeline({ ...input, now: () => Date.parse("2026-07-23T12:00:00.000Z") })
  return (
    <div>
      <span data-testid="future">{t.future.map((e) => e.title).join(",")}</span>
      <span data-testid="current">{t.current?.title ?? "-"}</span>
      <span data-testid="past">{t.past.map((e) => e.title).join(",")}</span>
      <span data-testid="pending">{t.pending.map((e) => e.title).join(",")}</span>
    </div>
  )
}

const EMPTY_INPUT: Input = {
  nowPlaying: null,
  queue: [],
  history: [],
  requests: [],
}

describe("useTimeline", () => {
  it("stays empty until the station reports something", () => {
    render(<Harness initial={EMPTY_INPUT} />)
    expect(screen.getByTestId("past").textContent).toBe("")
    expect(screen.getByTestId("current").textContent).toBe("-")
  })

  it("seeds from history once, then accrues from now-playing", () => {
    render(<Harness initial={EMPTY_INPUT} />)

    act(() => {
      setInput({
        ...EMPTY_INPUT,
        history: [{ title: "old", airedAt: "2026-07-23T09:00:00.000Z" }],
        queue: [{ title: "two", hasDedication: false }],
        nowPlaying: np("one"),
      })
    })
    expect(screen.getByTestId("past").textContent).toBe("old")
    expect(screen.getByTestId("current").textContent).toBe("one")
    expect(screen.getByTestId("future").textContent).toBe("two")

    act(() => {
      setInput({
        ...EMPTY_INPUT,
        history: [{ title: "old", airedAt: "2026-07-23T09:00:00.000Z" }],
        queue: [{ title: "two", hasDedication: false }],
        nowPlaying: np("two"),
      })
    })
    expect(screen.getByTestId("current").textContent).toBe("two")
    expect(screen.getByTestId("past").textContent).toBe("one,old")
    expect(screen.getByTestId("future").textContent).toBe("")
  })

  it("folds pending requests in", () => {
    render(<Harness initial={EMPTY_INPUT} />)
    act(() => {
      setInput({
        ...EMPTY_INPUT,
        nowPlaying: np("one"),
        requests: [
          {
            id: "r1",
            source: "listener",
            ytId: "y",
            title: "mine",
            durationS: 10,
            status: "approved",
            createdAt: "2026-07-23T09:00:00.000Z",
          },
        ],
      })
    })
    expect(screen.getByTestId("pending").textContent).toBe("mine")
  })

  it("keeps a pending request alive across the seeding transition", () => {
    // Same array reference throughout — the standalone ingestRequests effect
    // (deps [requests]) will not re-fire on the second render, so this only
    // passes if the seed effect itself folds `requests` in.
    const requests: TrackRequest[] = [
      {
        id: "r1",
        source: "listener",
        ytId: "y",
        title: "mine",
        durationS: 10,
        status: "approved",
        createdAt: "2026-07-23T09:00:00.000Z",
      },
    ]

    render(<Harness initial={{ ...EMPTY_INPUT, requests }} />)
    // Before seeding: nowPlaying is null and history is empty, so `seed`
    // has not run yet — the pending row comes from the standalone effect.
    expect(screen.getByTestId("pending").textContent).toBe("mine")

    act(() => {
      setInput({
        nowPlaying: np("one"),
        queue: [],
        history: [{ title: "old", airedAt: "2026-07-23T09:00:00.000Z" }],
        requests,
      })
    })

    // Seeding just ran (history/nowPlaying changed), replacing the whole
    // state — the pending row must have survived the replacement.
    expect(screen.getByTestId("current").textContent).toBe("one")
    expect(screen.getByTestId("pending").textContent).toBe("mine")
  })
})
