import { afterEach, describe, expect, it, vi } from "vitest"
import { PlayerStream, parseUserFrame, type PlayerStreamOptions, type UserFrame } from "../playerStream"

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

function fakeResponse(body: string, opts: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    body: sseStream([body]),
  } as unknown as Response
}

// Same as fakeResponse but delivers the body as separate read() chunks, to
// exercise cross-chunk buffer accumulation.
function fakeResponseChunks(chunks: string[], opts: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    body: sseStream(chunks),
  } as unknown as Response
}

function makeStream(overrides: Partial<PlayerStreamOptions> = {}) {
  const frames: UserFrame[] = []
  const errors: unknown[] = []
  const stream = new PlayerStream({
    url: "https://api.algovn.com/events/the-button.user",
    getToken: () => "tok-1",
    onFrame: f => frames.push(f),
    onError: e => errors.push(e),
    random: () => 0.5,
    ...overrides,
  })
  return { stream, frames, errors }
}

const USER_FRAME_JSON = {
  type: "user",
  sub: "u1",
  total: 10,
  allTimeRank: 2,
  weeklyRank: 1,
  unlocked: [{ id: "ten", title: "T", description: "d" }],
  questProgress: [
    {
      id: "warmup",
      title: "W",
      description: "d",
      kind: "daily",
      target: 100,
      progress: 10,
      done: false,
      reward: "+50 XP",
    },
  ],
  questsDone: [],
  streak: { count: 3, best: 5, lastDay: "2026-07-19" },
}

const EXPECTED_FRAME: UserFrame = {
  total: 10,
  allTimeRank: 2,
  weeklyRank: 1,
  unlocked: [{ id: "ten", title: "T", description: "d" }],
  questProgress: [
    {
      id: "warmup",
      title: "W",
      description: "d",
      kind: "daily",
      target: 100,
      progress: 10,
      done: false,
      reward: "+50 XP",
    },
  ],
  questsDone: [],
  streak: { current: 3, best: 5, lastDay: "2026-07-19" },
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("parseUserFrame", () => {
  it("maps worker JSON to a normalized UserFrame", () => {
    expect(parseUserFrame(USER_FRAME_JSON)).toEqual(EXPECTED_FRAME)
  })

  it("maps a weekly quest kind", () => {
    const first = USER_FRAME_JSON.questProgress[0]!
    const json = { ...USER_FRAME_JSON, questProgress: [{ ...first, kind: "weekly" }] }
    const frame = parseUserFrame(json)
    expect(frame?.questProgress[0]?.kind).toBe("weekly")
  })

  it("returns null for a non-user frame", () => {
    expect(parseUserFrame({ type: "counter", total: 5 })).toBeNull()
    expect(parseUserFrame({ type: "milestone" })).toBeNull()
  })

  it("returns null, never throws, on shape mismatch", () => {
    expect(parseUserFrame(null)).toBeNull()
    expect(parseUserFrame("not an object")).toBeNull()
    expect(parseUserFrame(42)).toBeNull()
    expect(parseUserFrame({ type: "user" })).toBeNull() // missing streak
    expect(() => parseUserFrame({ type: "user", streak: null })).not.toThrow()
    expect(parseUserFrame({ type: "user", streak: null })).toBeNull()
    expect(() => parseUserFrame({ type: "user", streak: {}, unlocked: "nope" })).not.toThrow()
  })
})

describe("PlayerStream", () => {
  it("streams and normalizes a data frame", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      fakeResponse(`data: ${JSON.stringify(USER_FRAME_JSON)}\n\n`)
    )
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("reassembles a multi-line data frame", async () => {
    // A pretty-printed payload's own newlines are all outside string literals,
    // so splitting on them and rejoining with "\n" reconstructs valid JSON —
    // mirroring how the gateway would emit one "data:" line per source line.
    const payload = JSON.stringify(USER_FRAME_JSON, null, 2)
    const sse = payload
      .split("\n")
      .map(line => `data: ${line}`)
      .join("\n")
      .concat("\n\n")
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(sse))
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("ignores heartbeat comments and the retry preamble", async () => {
    const sse = `retry: 3000\n\n: ping\n\ndata: ${JSON.stringify(USER_FRAME_JSON)}\n\n: ping\n\n`
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(sse))
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("reassembles a frame whose JSON payload is split across two read() chunks", async () => {
    const frame = `data: ${JSON.stringify(USER_FRAME_JSON)}\n\n`
    const mid = Math.floor(frame.length / 2) // lands inside the JSON payload
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      fakeResponseChunks([frame.slice(0, mid), frame.slice(mid)])
    )
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("reassembles a frame whose trailing \\n\\n boundary is split across two read() chunks", async () => {
    const payload = `data: ${JSON.stringify(USER_FRAME_JSON)}`
    // chunk 1 ends right after the first "\n" of the "\n\n" terminator; chunk 2
    // is only the second "\n" — the frame boundary itself straddles the read().
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      fakeResponseChunks([`${payload}\n`, "\n"])
    )
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("parses a CRLF-framed event (\\r\\n line endings)", async () => {
    const sse = `data: ${JSON.stringify(USER_FRAME_JSON)}\r\n\r\n`
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(sse))
    vi.stubGlobal("fetch", fetchMock)
    const { stream, frames } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(frames).toHaveLength(1))
    expect(frames[0]).toEqual(EXPECTED_FRAME)
    stream.stop()
  })

  it("sends the Authorization bearer header from getToken", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(""))
    vi.stubGlobal("fetch", fetchMock)
    const { stream } = makeStream({ getToken: () => "secret-tok" })
    stream.start()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls[0]!
    expect(call[0]).toBe("https://api.algovn.com/events/the-button.user")
    expect(call[1]?.headers).toMatchObject({
      Authorization: "Bearer secret-tok",
      Accept: "text/event-stream",
    })
    stream.stop()
  })

  it("retries shortly without fetching when getToken returns null", async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(""))
    vi.stubGlobal("fetch", fetchMock)
    let token: string | null = null
    const { stream } = makeStream({ getToken: () => token })
    stream.start()
    expect(fetchMock).not.toHaveBeenCalled()
    token = "now-available"
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    stream.stop()
  })

  it("stop() aborts the in-flight fetch and does not reconnect", async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"))
        })
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { stream, errors } = makeStream()
    stream.start()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    stream.stop()
    await vi.waitFor(() => expect(capturedSignal?.aborted).toBe(true))
    // give the aborted fetch's rejection a tick to reach the catch block
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1) // no backoff-reconnect after an intentional stop
    expect(errors).toHaveLength(0) // AbortError is swallowed, not surfaced via onError
  })
})
